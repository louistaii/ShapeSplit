// Vercel Serverless Function for player search
const LeagueDataFetcher = require('./_lib/leagueDataFetcher');
const PersonalityAnalyzer = require('./_lib/personalityAnalyzer');

module.exports = async (req, res) => {
    try {
        // Extract parameters from URL path
        const path = req.url.split('?')[0];
        const pathParts = path.split('/').filter(p => p);
        
        // Expected format: /api/search/gameName/tagLine
        const gameName = decodeURIComponent(pathParts[2] || req.query.gameName || '');
        const tagLine = decodeURIComponent(pathParts[3] || req.query.tagLine || '');
        const region = req.query.region || 'na1';

        if (!gameName || !tagLine) {
            return res.status(400).json({ 
                error: 'Missing required parameters: gameName and tagLine' 
            });
        }

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
            100,  // maxFetch
            25,   // targetAnalyze
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

        res.status(200).json(playerData);

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
};
