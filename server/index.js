const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const https = require('https');
const axios = require('axios');
require('dotenv').config();

// Disable SSL certificate verification for Zscaler/corporate proxies
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const LeagueDataFetcher = require('./leagueDataFetcher');
const PersonalityAnalyzer = require('./personalityAnalyzer');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase JSON payload limit for matchmaking

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test Bedrock configuration
app.get('/api/bedrock-test', async (req, res) => {
    try {
        if (!process.env.BEDROCK_API_KEY || !process.env.AWS_REGION) {
            return res.json({
                configured: false,
                message: 'Bedrock not configured. Set BEDROCK_API_KEY and AWS_REGION in .env file.'
            });
        }

        // Simple test call to Bedrock
        const apiKey = process.env.BEDROCK_API_KEY;
        const awsRegion = process.env.AWS_REGION;
        const modelId = "anthropic.claude-3-5-sonnet-20240620-v1:0";
        const url = `https://bedrock-runtime.${awsRegion}.amazonaws.com/model/${modelId}/invoke`;

        const payload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 50,
            messages: [{ "role": "user", "content": "Say hello in one sentence." }],
        };

        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout: 10000
        });

        res.json({
            configured: true,
            message: 'Bedrock is working correctly!',
            testResponse: response.data.content[0].text,
            region: awsRegion
        });

    } catch (error) {
        console.error('Bedrock test error:', error);
        res.json({
            configured: false,
            message: 'Bedrock configuration error',
            error: error.response?.data?.message || error.message
        });
    }
});

// Test endpoint to show Data Dragon images without requiring API calls
app.get('/api/test-images', async (req, res) => {
    try {
        // Use a hardcoded stable version to avoid network issues
        const latestVersion = '14.20.1';
        
        // Mock response with sample data and Data Dragon image URLs
        const mockData = {
            metadata: {
                fetchedAt: new Date().toISOString(),
                gameName: 'SamplePlayer',
                tagLine: 'NA1',
                ddragonVersion: latestVersion
            },
            account: {
                gameName: 'SamplePlayer',
                tagLine: 'NA1',
                puuid: 'sample-puuid'
            },
            summoner: {
                id: 'sample',
                summonerLevel: 150,
                profileIconId: 4658,
                profileIconUrl: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/profileicon/4658.png`
            },
            matches: [
                {
                    metadata: { matchId: 'sample1' },
                    info: {
                        gameCreation: Date.now() - 3600000,
                        gameDuration: 1845,
                        gameMode: 'CLASSIC',
                        participants: [
                            {
                                puuid: 'sample-puuid',
                                championId: 157,
                                championName: 'Yasuo',
                                championImageUrl: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/Yasuo.png`,
                                kills: 12,
                                deaths: 4,
                                assists: 8,
                                win: true
                            }
                        ]
                    }
                },
                {
                    metadata: { matchId: 'sample2' },
                    info: {
                        gameCreation: Date.now() - 7200000,
                        gameDuration: 2156,
                        gameMode: 'CLASSIC',
                        participants: [
                            {
                                puuid: 'sample-puuid',
                                championId: 238,
                                championName: 'Zed',
                                championImageUrl: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/Zed.png`,
                                kills: 15,
                                deaths: 6,
                                assists: 10,
                                win: false
                            }
                        ]
                    }
                },
                {
                    metadata: { matchId: 'sample3' },
                    info: {
                        gameCreation: Date.now() - 10800000,
                        gameDuration: 1624,
                        gameMode: 'CLASSIC',
                        participants: [
                            {
                                puuid: 'sample-puuid',
                                championId: 103,
                                championName: 'Ahri',
                                championImageUrl: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/Ahri.png`,
                                kills: 8,
                                deaths: 2,
                                assists: 15,
                                win: true
                            }
                        ]
                    }
                }
            ]
        };
        
        res.json(mockData);
    } catch (error) {
        console.error('Test images error:', error);
        res.status(500).json({ error: 'Failed to generate test data' });
    }
});

// Server-Sent Events endpoint for real-time progress updates
app.get('/api/search/:gameName/:tagLine/progress', async (req, res) => {
    const { gameName, tagLine } = req.params;
    const { region = 'na1' } = req.query;

    // Set up SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const sendProgress = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        // Map regions to their routing regions
        const regionToRoutingMap = {
            'na1': 'americas', 'br1': 'americas', 'la1': 'americas', 'la2': 'americas',
            'kr': 'asia', 'jp1': 'asia',
            'euw1': 'europe', 'eun1': 'europe', 'tr1': 'europe', 'ru': 'europe',
            'oc1': 'sea', 'ph2': 'sea', 'sg2': 'sea', 'th2': 'sea', 'tw2': 'sea', 'vn2': 'sea'
        };

        const routingRegion = regionToRoutingMap[region] || 'americas';

        if (!process.env.RIOT_API_KEY) {
            sendProgress({ type: 'error', message: 'API key not configured' });
            res.end();
            return;
        }

        const fetcher = new LeagueDataFetcher(
            process.env.RIOT_API_KEY,
            region,
            routingRegion
        );

        // Add progress callback to fetcher
        fetcher.progressCallback = sendProgress;

        sendProgress({ type: 'progress', message: 'Starting analysis...', step: 1, total: 8 });

        const playerData = await fetcher.getCompletePlayerData(
            gameName,
            tagLine,
            100,  // maxFetch
            50,   // targetAnalyze
            true
        );

        // Add personality analysis if we have match data
        if (playerData.matches && playerData.matches.length > 0) {
            try {
                sendProgress({ type: 'progress', message: '🧠 Analyzing personality patterns...', step: 7, total: 8 });
                const analyzer = new PersonalityAnalyzer();
                const personalityData = analyzer.analyzePersonality(playerData.matches, playerData.account.puuid);
                playerData.personality = personalityData;
                sendProgress({ type: 'progress', message: '✅ Personality analysis completed!', step: 8, total: 8 });
            } catch (analysisError) {
                console.error('Personality analysis failed:', analysisError);
                playerData.personality = { error: 'Analysis failed', message: analysisError.message };
                sendProgress({ type: 'error', message: 'Personality analysis failed' });
            }
        }

        sendProgress({ type: 'complete', data: playerData });
        res.end();

    } catch (error) {
        console.error('Search error:', error);
        sendProgress({ type: 'error', message: error.message });
        res.end();
    }
});

app.get('/api/search/:gameName/:tagLine', async (req, res) => {
    try {
        const { gameName, tagLine } = req.params;
        const { region = 'na1' } = req.query;

        // Map regions to their routing regions
        const regionToRoutingMap = {
            'na1': 'americas',
            'br1': 'americas', 
            'la1': 'americas',
            'la2': 'americas',
            'kr': 'asia',
            'jp1': 'asia',
            'euw1': 'europe',
            'eun1': 'europe',
            'tr1': 'europe',
            'ru': 'europe',
            'oc1': 'sea',
            'ph2': 'sea',
            'sg2': 'sea',
            'th2': 'sea',
            'tw2': 'sea',
            'vn2': 'sea'
        };

        const routingRegion = regionToRoutingMap[region] || 'americas';

        if (!process.env.RIOT_API_KEY) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        const fetcher = new LeagueDataFetcher(
            process.env.RIOT_API_KEY,
            region,
            routingRegion
        );

        const playerData = await fetcher.getCompletePlayerData(
            gameName,
            tagLine,
            100,  // maxFetch - like Python GAMES_TO_FETCH
            50,   // targetAnalyze - like Python GAMES_TO_ANALYZE
            true
        );

        // Add personality analysis if we have match data
        if (playerData.matches && playerData.matches.length > 0) {
            try {
                const analyzer = new PersonalityAnalyzer();
                const personalityData = analyzer.analyzePersonality(playerData.matches, playerData.account.puuid);
                playerData.personality = personalityData;
                console.log(`✅ Personality analysis completed for ${gameName}#${tagLine}`);
            } catch (analysisError) {
                console.error('Personality analysis failed:', analysisError);
                playerData.personality = { error: 'Analysis failed', message: analysisError.message };
            }
        }

        res.json(playerData);

    } catch (error) {
        console.error('Search error:', error);
        
        if (error.response?.status === 404) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        if (error.response?.status === 403) {
            return res.status(403).json({ error: 'Invalid API key or rate limit exceeded' });
        }

        res.status(500).json({ 
            error: 'Failed to fetch player data',
            details: error.message 
        });
    }
});

app.get('/api/regions', (req, res) => {
    res.json({
        regions: [
            { value: 'na1', label: 'North America', routing: 'americas' },
            { value: 'euw1', label: 'Europe West', routing: 'europe' },
            { value: 'eun1', label: 'Europe Nordic & East', routing: 'europe' },
            { value: 'kr', label: 'Korea', routing: 'asia' },
            { value: 'jp1', label: 'Japan', routing: 'asia' },
            { value: 'br1', label: 'Brazil', routing: 'americas' },
            { value: 'la1', label: 'Latin America North', routing: 'americas' },
            { value: 'la2', label: 'Latin America South', routing: 'americas' },
            { value: 'oc1', label: 'Oceania', routing: 'sea' },
            { value: 'tr1', label: 'Turkey', routing: 'europe' },
            { value: 'ru', label: 'Russia', routing: 'europe' },
            { value: 'ph2', label: 'Philippines', routing: 'sea' },
            { value: 'sg2', label: 'Singapore', routing: 'sea' },
            { value: 'th2', label: 'Thailand', routing: 'sea' },
            { value: 'tw2', label: 'Taiwan', routing: 'sea' },
            { value: 'vn2', label: 'Vietnam', routing: 'sea' }
        ]
    });
});

// Matchmaking endpoint - calculates compatibility between two players
app.post('/api/matchmaking', async (req, res) => {
    const { player1Data, player2GameName, player2TagLine, region = 'na1' } = req.body;
    
    if (!player1Data || !player2GameName || !player2TagLine) {
        return res.status(400).json({ 
            error: 'Missing required fields: player1Data, player2GameName, player2TagLine' 
        });
    }

    try {
        // Use same region mapping logic as main search
        const regionToRoutingMap = {
            'na1': 'americas',
            'br1': 'americas', 
            'la1': 'americas',
            'la2': 'americas',
            'kr': 'asia',
            'jp1': 'asia',
            'euw1': 'europe',
            'eun1': 'europe',
            'tr1': 'europe',
            'ru': 'europe',
            'oc1': 'sea',
            'ph2': 'sea',
            'sg2': 'sea',
            'th2': 'sea',
            'tw2': 'sea',
            'vn2': 'sea'
        };

        // Use the region from request (defaults to na1 if not provided)
        const routingRegion = regionToRoutingMap[region] || 'americas';
        
        const fetcher = new LeagueDataFetcher(process.env.RIOT_API_KEY, region, routingRegion);
        const analyzer = new PersonalityAnalyzer();

        // Only fetch player 2 data since player 1 data is already provided
        const player2Data = await fetcher.getCompletePlayerData(
            player2GameName, 
            player2TagLine, 
            100, // maxFetch - same as main search
            50,  // targetAnalyze - same as main search
            true // includeRankedMatches - same as main search
        );

        // Analyze both players' personalities
        // Player 1 personality should already be analyzed, but re-analyze if needed
        let player1Personality = player1Data.personality;
        if (!player1Personality || player1Personality.error) {
            try {
                player1Personality = analyzer.analyzePersonality(player1Data.matches, player1Data.account?.puuid);
            } catch (analysisError) {
                player1Personality = { error: 'Analysis failed', message: analysisError.message };
            }
        }
        
        // Analyze player 2 personality
        let player2Personality;
        try {
            player2Personality = analyzer.analyzePersonality(player2Data.matches, player2Data.account?.puuid);
        } catch (analysisError) {
            player2Personality = { error: 'Analysis failed', message: analysisError.message };
        }

        // Calculate compatibility using AI
        const compatibility = await calculateCompatibilityWithAI(
            player1Personality, 
            player2Personality, 
            player1Data, 
            player2Data
        );

        res.json({
            success: true,
            player1: {
                gameName: player1Data.account?.gameName,
                tagLine: player1Data.account?.tagLine,
                profileIconUrl: player1Data.summoner?.profileIconUrl,
                personality: player1Personality
            },
            player2: {
                gameName: player2Data.account?.gameName,
                tagLine: player2Data.account?.tagLine,
                profileIconUrl: player2Data.summoner?.profileIconUrl,
                personality: player2Personality,
                ranked: player2Data.ranked,
                championMastery: player2Data.championMastery
            },
            compatibility
        });

    } catch (error) {
        console.error('Matchmaking error:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to calculate compatibility',
            details: error.response?.data || null
        });
    }
});

// AI-powered compatibility calculation using Amazon Bedrock Claude
async function calculateCompatibilityWithAI(player1Personality, player2Personality, player1Data, player2Data) {
    // First, get the basic compatibility score using rule-based system
    const basicCompatibility = calculateCompatibility(player1Personality, player2Personality, player1Data, player2Data);
    
    // If Bedrock is not configured or personalities are missing, return basic result
    if (!process.env.BEDROCK_API_KEY || !process.env.AWS_REGION || 
        !player1Personality?.personality || !player2Personality?.personality ||
        player1Personality.error || player2Personality.error) {
        return basicCompatibility;
    }

    try {
        const apiKey = process.env.BEDROCK_API_KEY;
        const awsRegion = process.env.AWS_REGION;
        const modelId = "anthropic.claude-3-5-sonnet-20240620-v1:0";
        const url = `https://bedrock-runtime.${awsRegion}.amazonaws.com/model/${modelId}/invoke`;

        // Build comprehensive context for AI analysis
        const player1Context = buildPlayerCompatibilityContext(player1Data, player1Personality, 'Player 1');
        const player2Context = buildPlayerCompatibilityContext(player2Data, player2Personality, 'Player 2');

        const prompt = `You are an expert League of Legends duo compatibility analyst. Analyze the compatibility between these two players and provide insightful, personalized feedback.

${player1Context}

${player2Context}

Based on their personalities, playstyles, and stats, provide a compatibility analysis in the following JSON format:
{
  "score": <number 0-100>,
  "level": "<Excellent|Very Good|Good|Fair|Challenging>",
  "recommendation": "<2-3 sentence personalized recommendation>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "challenges": ["<challenge 1>", "<challenge 2>"]
}

Guidelines:
- Score should reflect overall duo potential (personality + playstyle + skill synergy)
- Recommendation should be warm, encouraging, and specific to their duo dynamic
- Strengths should highlight 3 key synergies (personality, playstyle, or role compatibility)
- Challenges should mention 1-2 areas to work on (be constructive, not negative)
- Use their actual champion preferences, roles, and personality traits in your analysis
- Be conversational but insightful - make it feel personalized
- Reference specific archetypes and traits when relevant

Respond ONLY with the JSON object, no other text.`;

        const payload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 500,
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7
        };

        console.log('🤖 Generating AI compatibility analysis...');

        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout: 30000
        });

        const aiResponse = response.data.content[0].text;
        console.log('✅ AI compatibility analysis generated');

        // Parse the AI response
        const aiCompatibility = JSON.parse(aiResponse);

        // Validate the response structure
        if (!aiCompatibility.score || !aiCompatibility.level || !aiCompatibility.recommendation) {
            throw new Error('Invalid AI response format');
        }

        return {
            score: Math.max(0, Math.min(100, Math.round(aiCompatibility.score))),
            level: aiCompatibility.level,
            recommendation: aiCompatibility.recommendation,
            strengths: aiCompatibility.strengths || [],
            challenges: aiCompatibility.challenges || [],
            aiGenerated: true
        };

    } catch (error) {
        console.error('AI compatibility generation failed:', error);
        console.log('⚠️ Falling back to rule-based compatibility');
        
        // Return the basic rule-based result as fallback
        return {
            ...basicCompatibility,
            aiGenerated: false,
            fallback: true
        };
    }
}

// Helper function to build player context for compatibility analysis
function buildPlayerCompatibilityContext(playerData, personality, label) {
    let context = [`${label}:`];
    
    // Basic info
    if (playerData.account) {
        context.push(`  Name: ${playerData.account.gameName}#${playerData.account.tagLine}`);
    }
    
    if (playerData.summoner?.summonerLevel) {
        context.push(`  Level: ${playerData.summoner.summonerLevel}`);
    }
    
    // Ranked info
    if (playerData.ranked?.length > 0) {
        const soloRank = playerData.ranked.find(r => r.queueType === 'RANKED_SOLO_5x5');
        if (soloRank) {
            const winRate = Math.round((soloRank.wins / (soloRank.wins + soloRank.losses)) * 100);
            context.push(`  Rank: ${soloRank.tier} ${soloRank.rank} ${soloRank.leaguePoints}LP (${winRate}% WR, ${soloRank.wins}W/${soloRank.losses}L)`);
        }
    }
    
    // Champion mastery
    if (playerData.championMastery?.champions?.length > 0) {
        const topChamps = playerData.championMastery.champions.slice(0, 3).map(c => 
            c.championName || `Champion ${c.championId}`
        ).join(', ');
        context.push(`  Main Champions: ${topChamps}`);
    }
    
    // Personality analysis
    if (personality?.personality) {
        const p = personality.personality;
        
        if (p.archetype) {
            context.push(`  Archetype: ${p.archetype.name} (${p.archetype.similarity}% match)`);
            context.push(`  Archetype Description: ${p.archetype.description}`);
        }
        
        if (p.bigFive) {
            context.push(`  Personality Traits:`);
            Object.entries(p.bigFive).forEach(([trait, score]) => {
                context.push(`    - ${trait}: ${score}%`);
            });
        }
    }
    
    // Playstyle stats
    if (personality?.stats?.features) {
        const stats = personality.stats.features;
        context.push(`  Playstyle:`);
        if (stats.primaryRole) context.push(`    - Primary Role: ${stats.primaryRole}`);
        if (stats.avgKda) context.push(`    - Average KDA: ${stats.avgKda.toFixed(2)}`);
        if (stats.aggressionIndex !== undefined) {
            const aggressionLevel = stats.aggressionIndex > 0.7 ? 'Very Aggressive' : 
                                   stats.aggressionIndex > 0.5 ? 'Aggressive' :
                                   stats.aggressionIndex > 0.3 ? 'Balanced' : 'Passive';
            context.push(`    - Aggression: ${aggressionLevel} (${(stats.aggressionIndex * 100).toFixed(0)}%)`);
        }
        if (stats.championDiversity !== undefined) {
            context.push(`    - Champion Pool: ${(stats.championDiversity * 100).toFixed(0)}% diversity`);
        }
        if (stats.killParticipation !== undefined) {
            context.push(`    - Kill Participation: ${(stats.killParticipation * 100).toFixed(0)}%`);
        }
    }
    
    return context.join('\n');
}

// Compatibility calculation function (rule-based fallback)
function calculateCompatibility(player1Personality, player2Personality, player1Data, player2Data) {
    let score = 50; // Base compatibility score
    let reasons = [];
    let strengths = [];
    let challenges = [];

    // Check if both have valid personality data
    if (!player1Personality?.personality || !player2Personality?.personality || 
        player1Personality.error || player2Personality.error) {
        
        let reasonMessage = 'Not enough data to calculate accurate compatibility';
        if (player1Personality?.error && player2Personality?.error) {
            reasonMessage = 'Both players need more ranked/normal games for personality analysis';
        } else if (player1Personality?.error) {
            reasonMessage = 'First player needs more ranked/normal games for personality analysis';
        } else if (player2Personality?.error) {
            reasonMessage = 'Second player needs more ranked/normal games for personality analysis';
        }
        
        return {
            score: 50,
            level: 'Unknown',
            reasons: [reasonMessage],
            strengths: [],
            challenges: [],
            recommendation: 'Play more ranked or normal games individually to unlock personality insights!'
        };
    }

    const p1Traits = player1Personality.personality.bigFive;
    const p2Traits = player2Personality.personality.bigFive;
    const p1Stats = player1Personality.stats?.features || {};
    const p2Stats = player2Personality.stats?.features || {};

    // Personality trait compatibility (Big Five)
    const traitDifferences = {};
    let totalTraitDiff = 0;
    
    Object.keys(p1Traits).forEach(trait => {
        const diff = Math.abs(p1Traits[trait] - p2Traits[trait]);
        traitDifferences[trait] = diff;
        totalTraitDiff += diff;
    });

    const avgTraitDiff = totalTraitDiff / Object.keys(p1Traits).length;
    
    // Complementary vs Similar preferences
    if (avgTraitDiff < 20) {
        score += 15;
        strengths.push('Very similar personalities - you think alike!');
    } else if (avgTraitDiff < 40) {
        score += 10;
        strengths.push('Balanced personality differences - good synergy potential');
    } else {
        score -= 5;
        challenges.push('Very different personalities - may require extra communication');
    }

    // Specific trait analysis
    // Agreeableness compatibility (both high = good team players)
    if (p1Traits.Agreeableness > 70 && p2Traits.Agreeableness > 70) {
        score += 10;
        strengths.push('Both are team-oriented and cooperative');
    }
    
    // Conscientiousness balance (one organized, one flexible can work well)
    const conscDiff = Math.abs(p1Traits.Conscientiousness - p2Traits.Conscientiousness);
    if (conscDiff > 30 && conscDiff < 60) {
        score += 8;
        strengths.push('Good balance of planning and adaptability');
    }

    // Extraversion compatibility for communication
    if (Math.abs(p1Traits.Extraversion - p2Traits.Extraversion) < 30) {
        score += 5;
        strengths.push('Similar communication styles');
    }

    // Playstyle compatibility
    if (p1Stats.primaryRole && p2Stats.primaryRole) {
        if (p1Stats.primaryRole !== p2Stats.primaryRole) {
            score += 15;
            strengths.push(`Complementary roles: ${p1Stats.primaryRole} + ${p2Stats.primaryRole}`);
        } else {
            score -= 5;
            challenges.push(`Both prefer ${p1Stats.primaryRole} - role flexibility needed`);
        }
    }

    // Aggression index compatibility
    if (p1Stats.aggressionIndex && p2Stats.aggressionIndex) {
        const aggrDiff = Math.abs(p1Stats.aggressionIndex - p2Stats.aggressionIndex);
        if (aggrDiff < 0.3) {
            score += 8;
            strengths.push('Similar aggression levels - good fight coordination');
        } else if (aggrDiff > 0.6) {
            score -= 3;
            challenges.push('Very different aggression styles - sync your engages');
        }
    }

    // KDA compatibility (not too different skill levels)
    if (p1Stats.avgKda && p2Stats.avgKda) {
        const kdaDiff = Math.abs(p1Stats.avgKda - p2Stats.avgKda);
        if (kdaDiff < 0.5) {
            score += 5;
            strengths.push('Similar skill levels');
        } else if (kdaDiff > 1.5) {
            score -= 8;
            challenges.push('Different skill levels - mentor/learning opportunity');
        }
    }

    // Champion diversity compatibility
    if (p1Stats.championDiversity && p2Stats.championDiversity) {
        const diversityDiff = Math.abs(p1Stats.championDiversity - p2Stats.championDiversity);
        if (diversityDiff < 0.3) {
            score += 5;
            strengths.push('Similar champion pool flexibility');
        }
    }

    // Archetype compatibility
    const p1Archetype = player1Personality.personality.archetype.name;
    const p2Archetype = player2Personality.personality.archetype.name;
    
    // Define archetype synergies
    const synergies = {
        'Hero': ['Caregiver', 'Sage', 'Ruler'],
        'Caregiver': ['Hero', 'Innocent', 'Lover'],
        'Sage': ['Hero', 'Creator', 'Magician'],
        'Explorer': ['Rebel', 'Creator', 'Magician'],
        'Rebel': ['Explorer', 'Jester'],
        'Creator': ['Sage', 'Explorer', 'Magician'],
        'Magician': ['Sage', 'Creator', 'Ruler'],
        'Ruler': ['Hero', 'Sage', 'Magician'],
        'Innocent': ['Caregiver', 'Lover'],
        'Lover': ['Caregiver', 'Innocent'],
        'Jester': ['Rebel', 'Explorer'],
        'Orphan': ['Caregiver', 'Hero']
    };

    if (synergies[p1Archetype]?.includes(p2Archetype)) {
        score += 12;
        strengths.push(`${p1Archetype} + ${p2Archetype} archetypes work great together!`);
    } else if (p1Archetype === p2Archetype) {
        score += 5;
        strengths.push(`Both ${p1Archetype} types - you understand each other`);
    }

    // Cap the score
    score = Math.max(0, Math.min(100, score));

    // Determine compatibility level
    let level;
    if (score >= 80) level = 'Excellent';
    else if (score >= 65) level = 'Very Good';
    else if (score >= 50) level = 'Good';
    else if (score >= 35) level = 'Fair';
    else level = 'Challenging';

    // Generate recommendation
    let recommendation;
    if (score >= 80) {
        recommendation = 'Perfect duo queue partners! Your playstyles complement each other beautifully.';
    } else if (score >= 65) {
        recommendation = 'Great compatibility! You should have excellent synergy in most games.';
    } else if (score >= 50) {
        recommendation = 'Solid partnership potential. Focus on communication and you\'ll do great!';
    } else if (score >= 35) {
        recommendation = 'You can make it work with good communication and understanding each other\'s style.';
    } else {
        recommendation = 'Very different styles, but opposites can attract! Be patient and learn from each other.';
    }

    return {
        score: Math.round(score),
        level,
        reasons: reasons,
        strengths,
        challenges,
        recommendation
    };
}

// Chat endpoint powered by Amazon Bedrock Claude 3.5 Sonnet
app.post('/api/chat', async (req, res) => {
    try {
        const { message, playerData, chatHistory = [] } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        // Validate Bedrock configuration
        if (!process.env.BEDROCK_API_KEY || !process.env.AWS_REGION) {
            return res.status(500).json({ 
                error: 'Bedrock not configured. Please set BEDROCK_API_KEY and AWS_REGION environment variables.' 
            });
        }

        const apiKey = process.env.BEDROCK_API_KEY;
        const awsRegion = process.env.AWS_REGION;
        const modelId = "anthropic.claude-3-5-sonnet-20240620-v1:0";

        // Construct the API request URL
        const url = `https://bedrock-runtime.${awsRegion}.amazonaws.com/model/${modelId}/invoke`;

        // Build context about the player
        const playerContext = buildPlayerContext(playerData);
        
        // Prepare conversation history for Claude
        const messages = [];
        
        // Add system context as the first user message (Claude doesn't have system messages)
        messages.push({
            role: "user", 
            content: `You are ${playerData?.account?.gameName || 'this player'}'s League of Legends digital twin AI assistant. You have deep insights into their gameplay, personality, and performance patterns. Be conversational, insightful, and engaging. Use the player's actual data to provide meaningful analysis.

Player Context:
${playerContext}

Please respond as their digital twin, speaking knowledgeably about their League gameplay and personality. Keep responses concise but insightful (2-3 sentences typically).`
        });
        
        messages.push({
            role: "assistant", 
            content: "I understand. I'm ready to discuss this player's League of Legends journey, personality insights, and gameplay patterns based on their data."
        });
        
        // Add chat history (limit to last 10 messages to stay within token limits)
        const recentHistory = chatHistory.slice(-10);
        recentHistory.forEach(msg => {
            messages.push({
                role: msg.isUser ? "user" : "assistant",
                content: msg.text
            });
        });
        
        // Add current user message
        messages.push({
            role: "user",
            content: message
        });

        // Prepare the request payload
        const payload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 300,
            messages: messages,
            temperature: 0.7
        };

        console.log('Sending request to Amazon Bedrock...');
        
        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout: 30000 // 30 second timeout
        });
        
        const aiResponse = response.data.content[0].text;
        
        console.log('✅ Bedrock response received');
        
        res.json({
            success: true,
            response: aiResponse,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Chat error:', error);
        
        // Log detailed error for debugging
        if (error.response) {
            console.error('Bedrock API error response:', error.response.data);
        }
        
        // Fallback to basic response if Bedrock fails
        const fallbackResponse = generateFallbackResponse(req.body.message, req.body.playerData);
        
        res.json({
            success: true,
            response: fallbackResponse,
            fallback: true,
            error: error.response?.data?.message || error.message
        });
    }
});

// Helper function to build player context for Claude
function buildPlayerContext(playerData) {
    if (!playerData) return "No player data available.";
    
    let context = [];
    
    // Basic info
    if (playerData.account) {
        context.push(`Player: ${playerData.account.gameName}#${playerData.account.tagLine}`);
    }
    
    if (playerData.summoner?.summonerLevel) {
        context.push(`Level: ${playerData.summoner.summonerLevel}`);
    }
    
    // Ranked info
    if (playerData.ranked?.length > 0) {
        const soloRank = playerData.ranked.find(r => r.queueType === 'RANKED_SOLO_5x5');
        if (soloRank) {
            const winRate = Math.round((soloRank.wins / (soloRank.wins + soloRank.losses)) * 100);
            context.push(`Rank: ${soloRank.tier} ${soloRank.rank} ${soloRank.leaguePoints}LP (${winRate}% WR, ${soloRank.wins}W/${soloRank.losses}L)`);
        }
    }
    
    // Champion mastery
    if (playerData.championMastery?.champions?.length > 0) {
        const topChamps = playerData.championMastery.champions.slice(0, 3).map(c => 
            `${c.championName || `Champion ${c.championId}`} (${Math.floor(c.championPoints / 1000)}k pts)`
        ).join(', ');
        context.push(`Top Champions: ${topChamps}`);
    }
    
    // Personality analysis
    if (playerData.personality && !playerData.personality.error) {
        const personality = playerData.personality.personality;
        if (personality?.archetype) {
            context.push(`Archetype: ${personality.archetype.name} (${personality.archetype.similarity}% match)`);
        }
        
        if (personality?.bigFive) {
            const traits = Object.entries(personality.bigFive)
                .map(([trait, score]) => `${trait}: ${score}%`)
                .join(', ');
            context.push(`Personality Traits: ${traits}`);
        }
        
        if (playerData.personality.stats?.features) {
            const stats = playerData.personality.stats.features;
            if (stats.primaryRole) context.push(`Primary Role: ${stats.primaryRole}`);
            if (stats.avgKda) context.push(`Average KDA: ${stats.avgKda.toFixed(2)}`);
            if (stats.aggressionIndex) context.push(`Aggression Level: ${(stats.aggressionIndex * 100).toFixed(0)}%`);
        }
    }
    
    // Recent matches summary
    if (playerData.matches?.length > 0) {
        const recentGames = playerData.matches.slice(0, 5);
        const wins = recentGames.filter(match => {
            const participant = match.info.participants.find(p => p.puuid === playerData.account?.puuid);
            return participant?.win;
        }).length;
        context.push(`Recent Performance: ${wins}W/${recentGames.length - wins}L in last ${recentGames.length} games`);
    }
    
    return context.join('\n');
}

// Fallback response generator (same as existing)
function generateFallbackResponse(userMessage, playerData) {
    const message = userMessage.toLowerCase();
    const gameName = playerData?.account?.gameName || 'Player';
    
    if (message.includes('rank') || message.includes('tier')) {
        const soloRank = playerData?.ranked?.find(r => r.queueType === 'RANKED_SOLO_5x5');
        if (soloRank) {
            return `${gameName} is currently ${soloRank.tier} ${soloRank.rank} with ${soloRank.leaguePoints} LP. They have a ${Math.round((soloRank.wins / (soloRank.wins + soloRank.losses)) * 100)}% win rate this season!`;
        }
        return `${gameName} doesn't have a current solo queue ranking, but they're still climbing!`;
    }
    
    if (message.includes('champion') || message.includes('main')) {
        const topChampion = playerData?.championMastery?.champions?.[0];
        if (topChampion) {
            return `${gameName}'s highest mastery champion is ${topChampion.championName || `Champion ${topChampion.championId}`} with ${topChampion.championPoints?.toLocaleString()} mastery points!`;
        }
        return `${gameName} plays a variety of champions. Versatility is key!`;
    }
    
    const responses = [
        `That's an interesting question about ${gameName}! I'm having trouble with my advanced analysis right now, but their gameplay shows consistent patterns.`,
        `Great question! While I can't access my full personality insights at the moment, ${gameName} clearly has a unique approach to the game.`,
        `${gameName} would probably have some interesting thoughts on that! I'm experiencing some technical difficulties with my deeper analysis capabilities.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
