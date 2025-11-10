// Vercel Serverless Function for chat
const axios = require('axios');
const { digitalTwinSystemPrompt, digitalTwinAcknowledgment } = require('./_lib/prompts');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, playerData, chatHistory = [] } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        if (!process.env.BEDROCK_API_KEY || !process.env.AWS_REGION) {
            return res.status(500).json({ 
                error: 'Bedrock not configured. Please set BEDROCK_API_KEY and AWS_REGION environment variables.' 
            });
        }

        const apiKey = process.env.BEDROCK_API_KEY;
        const awsRegion = process.env.AWS_REGION;
        const modelId = "anthropic.claude-sonnet-4-5-20250929-v1:0";
        const url = `https://bedrock-runtime.${awsRegion}.amazonaws.com/model/${modelId}/invoke`;

        const playerContext = buildPlayerContext(playerData);
        const messages = [];
        
        messages.push({
            role: "user", 
            content: digitalTwinSystemPrompt(playerData?.account?.gameName, playerContext)
        });
        
        messages.push({
            role: "assistant", 
            content: digitalTwinAcknowledgment()
        });
        
        const recentHistory = chatHistory.slice(-10);
        recentHistory.forEach(msg => {
            messages.push({
                role: msg.isUser ? "user" : "assistant",
                content: msg.text
            });
        });
        
        messages.push({
            role: "user",
            content: message
        });

        const payload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 300,
            messages: messages,
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
        
        res.status(200).json({
            success: true,
            response: aiResponse,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Chat error:', error);
        
        const fallbackResponse = generateFallbackResponse(req.body.message, req.body.playerData);
        
        res.status(200).json({
            success: true,
            response: fallbackResponse,
            fallback: true,
            error: error.response?.data?.message || error.message
        });
    }
};

function buildPlayerContext(playerData) {
    if (!playerData) return "No player data available.";
    
    let context = [];
    
    if (playerData.account) {
        context.push(`Player: ${playerData.account.gameName}#${playerData.account.tagLine}`);
    }
    
    if (playerData.summoner?.summonerLevel) {
        context.push(`Level: ${playerData.summoner.summonerLevel}`);
    }
    
    if (playerData.ranked?.length > 0) {
        const soloRank = playerData.ranked.find(r => r.queueType === 'RANKED_SOLO_5x5');
        if (soloRank) {
            const winRate = Math.round((soloRank.wins / (soloRank.wins + soloRank.losses)) * 100);
            context.push(`Rank: ${soloRank.tier} ${soloRank.rank} ${soloRank.leaguePoints}LP (${winRate}% WR, ${soloRank.wins}W/${soloRank.losses}L)`);
        }
    }
    
    if (playerData.championMastery?.champions?.length > 0) {
        const topChamps = playerData.championMastery.champions.slice(0, 3).map(c => 
            `${c.championName || `Champion ${c.championId}`} (${Math.floor(c.championPoints / 1000)}k pts)`
        ).join(', ');
        context.push(`Top Champions: ${topChamps}`);
    }
    
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
