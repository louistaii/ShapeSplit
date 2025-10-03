const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const https = require('https');
const axios = require('axios');
require('dotenv').config();

// Disable SSL certificate verification for Zscaler/corporate proxies
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const LeagueDataFetcher = require('./leagueDataFetcher');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
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

app.get('/api/search/:gameName/:tagLine', async (req, res) => {
    try {
        const { gameName, tagLine } = req.params;
        const { region = 'na1', matchCount = 10 } = req.query;

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
            parseInt(matchCount),
            true
        );

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
