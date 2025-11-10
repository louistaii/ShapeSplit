// Vercel Serverless Function for matchmaking
const axios = require('axios');
const LeagueDataFetcher = require('./_lib/leagueDataFetcher');
const PersonalityAnalyzer = require('./_lib/personalityAnalyzer');
const { compatibilityAnalysisPrompt } = require('./_lib/prompts');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { player1Data, player2GameName, player2TagLine, region = 'na1' } = req.body;
    
    if (!player1Data || !player2GameName || !player2TagLine) {
        return res.status(400).json({ 
            error: 'Missing required fields: player1Data, player2GameName, player2TagLine' 
        });
    }

    try {
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
        
        const fetcher = new LeagueDataFetcher(process.env.RIOT_API_KEY, region, routingRegion);
        const analyzer = new PersonalityAnalyzer();

        // Fetch player 2 data
        const player2Data = await fetcher.getCompletePlayerData(
            player2GameName, 
            player2TagLine, 
            100,
            25,
            true
        );

        // Analyze both players' personalities
        let player1Personality = player1Data.personality;
        if (!player1Personality || player1Personality.error) {
            try {
                player1Personality = analyzer.analyzePersonality(player1Data.matches, player1Data.account?.puuid);
            } catch (analysisError) {
                player1Personality = { error: 'Analysis failed', message: analysisError.message };
            }
        }
        
        let player2Personality;
        try {
            player2Personality = analyzer.analyzePersonality(player2Data.matches, player2Data.account?.puuid);
        } catch (analysisError) {
            player2Personality = { error: 'Analysis failed', message: analysisError.message };
        }

        // Calculate compatibility
        const compatibility = await calculateCompatibilityWithAI(
            player1Personality, 
            player2Personality, 
            player1Data, 
            player2Data
        );

        res.status(200).json({
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
};

// AI-powered compatibility calculation
async function calculateCompatibilityWithAI(player1Personality, player2Personality, player1Data, player2Data) {
    const basicCompatibility = calculateCompatibility(player1Personality, player2Personality, player1Data, player2Data);
    
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

        const player1Context = buildPlayerCompatibilityContext(player1Data, player1Personality, 'Player 1');
        const player2Context = buildPlayerCompatibilityContext(player2Data, player2Personality, 'Player 2');
        const prompt = compatibilityAnalysisPrompt(player1Context, player2Context);

        const payload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 500,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7
        };

        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout: 30000
        });

        const aiResponse = response.data.content[0].text;
        const aiCompatibility = JSON.parse(aiResponse);

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
        return {
            ...basicCompatibility,
            aiGenerated: false,
            fallback: true
        };
    }
}

function buildPlayerCompatibilityContext(playerData, personality, label) {
    let context = [`${label}:`];
    
    if (playerData.account) {
        context.push(`  Name: ${playerData.account.gameName}#${playerData.account.tagLine}`);
    }
    
    if (playerData.summoner?.summonerLevel) {
        context.push(`  Level: ${playerData.summoner.summonerLevel}`);
    }
    
    if (playerData.ranked?.length > 0) {
        const soloRank = playerData.ranked.find(r => r.queueType === 'RANKED_SOLO_5x5');
        if (soloRank) {
            const winRate = Math.round((soloRank.wins / (soloRank.wins + soloRank.losses)) * 100);
            context.push(`  Rank: ${soloRank.tier} ${soloRank.rank} ${soloRank.leaguePoints}LP (${winRate}% WR, ${soloRank.wins}W/${soloRank.losses}L)`);
        }
    }
    
    if (playerData.championMastery?.champions?.length > 0) {
        const topChamps = playerData.championMastery.champions.slice(0, 3).map(c => 
            c.championName || `Champion ${c.championId}`
        ).join(', ');
        context.push(`  Main Champions: ${topChamps}`);
    }
    
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

function calculateCompatibility(player1Personality, player2Personality, player1Data, player2Data) {
    let score = 50;
    let strengths = [];
    let challenges = [];

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

    let totalTraitDiff = 0;
    Object.keys(p1Traits).forEach(trait => {
        const diff = Math.abs(p1Traits[trait] - p2Traits[trait]);
        totalTraitDiff += diff;
    });

    const avgTraitDiff = totalTraitDiff / Object.keys(p1Traits).length;
    
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

    if (p1Traits.Agreeableness > 70 && p2Traits.Agreeableness > 70) {
        score += 10;
        strengths.push('Both are team-oriented and cooperative');
    }
    
    const conscDiff = Math.abs(p1Traits.Conscientiousness - p2Traits.Conscientiousness);
    if (conscDiff > 30 && conscDiff < 60) {
        score += 8;
        strengths.push('Good balance of planning and adaptability');
    }

    if (Math.abs(p1Traits.Extraversion - p2Traits.Extraversion) < 30) {
        score += 5;
        strengths.push('Similar communication styles');
    }

    if (p1Stats.primaryRole && p2Stats.primaryRole) {
        if (p1Stats.primaryRole !== p2Stats.primaryRole) {
            score += 15;
            strengths.push(`Complementary roles: ${p1Stats.primaryRole} + ${p2Stats.primaryRole}`);
        } else {
            score -= 5;
            challenges.push(`Both prefer ${p1Stats.primaryRole} - role flexibility needed`);
        }
    }

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

    if (p1Stats.championDiversity && p2Stats.championDiversity) {
        const diversityDiff = Math.abs(p1Stats.championDiversity - p2Stats.championDiversity);
        if (diversityDiff < 0.3) {
            score += 5;
            strengths.push('Similar champion pool flexibility');
        }
    }

    const p1Archetype = player1Personality.personality.archetype.name;
    const p2Archetype = player2Personality.personality.archetype.name;
    
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

    score = Math.max(0, Math.min(100, score));

    let level;
    if (score >= 80) level = 'Excellent';
    else if (score >= 65) level = 'Very Good';
    else if (score >= 50) level = 'Good';
    else if (score >= 35) level = 'Fair';
    else level = 'Challenging';

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
        reasons: [],
        strengths,
        challenges,
        recommendation
    };
}
