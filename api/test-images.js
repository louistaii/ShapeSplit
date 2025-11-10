// Vercel Serverless Function
module.exports = async (req, res) => {
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
        
        res.status(200).json(mockData);
    } catch (error) {
        console.error('Test images error:', error);
        res.status(500).json({ error: 'Failed to generate test data' });
    }
};
