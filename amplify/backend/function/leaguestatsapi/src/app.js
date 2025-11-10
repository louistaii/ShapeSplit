const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');

// Disable SSL certificate verification for Zscaler/corporate proxies
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const LeagueDataFetcher = require('./leagueDataFetcher');
const PersonalityAnalyzer = require('./personalityAnalyzer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test endpoint to show Data Dragon images without requiring API calls
app.get('/test-images', async (req, res) => {
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
app.get('/search/:gameName/:tagLine/progress', async (req, res) => {
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

app.get('/search/:gameName/:tagLine', async (req, res) => {
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

app.get('/regions', (req, res) => {
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
app.post('/matchmaking', async (req, res) => {
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

        // Calculate compatibility
        const compatibility = calculateCompatibility(player1Personality, player2Personality, player1Data, player2Data);

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

// Compatibility calculation function
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

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

module.exports = app;
