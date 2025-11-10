const axios = require('axios');
const https = require('https');

// Create HTTPS agent that ignores SSL certificate errors
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

class LeagueDataFetcher {
    constructor(apiKey, region, routingRegion) {
        this.apiKey = apiKey;
        this.region = region;
        this.routingRegion = routingRegion;
        this.headers = { "X-Riot-Token": apiKey };
        this.rateLimitDelay = 1200; // 1200 ms - matches Python script RATE_LIMIT_DELAY
        this.ddragonVersion = null; // Cache the Data Dragon version
        this.championData = null; // Cache champion data
        this.progressCallback = null; // Callback for progress updates
    }

    sendProgress(message, details = {}) {
        if (this.progressCallback) {
            this.progressCallback({
                type: 'progress',
                message,
                ...details
            });
        }
        console.log(message, details);
    }

    // Data Dragon methods
    async getDdragonVersion() {
        if (this.ddragonVersion) {
            return this.ddragonVersion;
        }
        
        try {
            const response = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json', {
                timeout: 5000,
                httpsAgent: httpsAgent
            });
            this.ddragonVersion = response.data[0]; // Latest version
            return this.ddragonVersion;
        } catch (error) {
            console.error('Error fetching Data Dragon version:', error);
            // Fallback to a known stable version
            this.ddragonVersion = '14.20.1';
            return this.ddragonVersion;
        }
    }

    async getChampionData() {
        if (this.championData) {
            return this.championData;
        }

        try {
            const version = await this.getDdragonVersion();
            const response = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`, {
                timeout: 10000,
                httpsAgent: httpsAgent
            });
            this.championData = response.data.data;
            return this.championData;
        } catch (error) {
            console.error('Error fetching champion data:', error);
            return {};
        }
    }

    getProfileIconUrl(profileIconId) {
        if (!this.ddragonVersion) {
            return null;
        }
        return `https://ddragon.leagueoflegends.com/cdn/${this.ddragonVersion}/img/profileicon/${profileIconId}.png`;
    }

    async getChampionImageUrl(championId) {
        try {
            const championData = await this.getChampionData();
            const version = await this.getDdragonVersion();
            
            // Find champion by ID
            const champion = Object.values(championData).find(champ => parseInt(champ.key) === championId);
            
            if (champion) {
                return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion.id}.png`;
            }
            
            return null;
        } catch (error) {
            console.error('Error getting champion image URL:', error);
            return null;
        }
    }

    async _makeRequest(url, params = null) {
        try {
            const response = await axios.get(url, {
                headers: this.headers,
                params: params,
                timeout: 10000,
                httpsAgent: httpsAgent // Use the SSL-ignoring agent
            });
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            console.error(`API Error: ${error.response?.status} - ${error.message}`);
            throw error;
        }
    }

    async _delay() {
        return new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
    }

    async getAccountByRiotId(gameName, tagLine) {
        const url = `https://${this.routingRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`;
        return this._makeRequest(url);
    }

    async getSummonerByPuuid(puuid) {
        const url = `https://${this.region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
        return this._makeRequest(url);
    }

    async getLeagueEntries(summonerId) {
        const url = `https://${this.region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
        return this._makeRequest(url);
    }

    async getAllChampionMasteries(puuid) {
        const url = `https://${this.region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`;
        return this._makeRequest(url);
    }

    async getChampionMasteryScore(puuid) {
        const url = `https://${this.region}.api.riotgames.com/lol/champion-mastery/v4/scores/by-puuid/${puuid}`;
        return this._makeRequest(url);
    }

    async getMatchIds(puuid, count = 20, start = 0) {
        const url = `https://${this.routingRegion}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids`;
        return this._makeRequest(url, { start, count });
    }

    async getMatchDetails(matchId) {
        const url = `https://${this.routingRegion}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
        return this._makeRequest(url);
    }

    async getCurrentGame(puuid) {
        const url = `https://${this.region}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}`;
        return this._makeRequest(url);
    }

    async getCompletePlayerData(gameName, tagLine, maxFetch = 100, targetAnalyze = 50, includeMatchDetails = true) {
        const data = {
            metadata: {
                fetchedAt: new Date().toISOString(),
                gameName,
                tagLine,
                maxFetch,
                targetAnalyze,
                region: this.region,
                routingRegion: this.routingRegion
            }
        };

        try {
            // Initialize Data Dragon version
            this.sendProgress('🔄 Initializing Data Dragon version...', { step: 1, total: 8 });
            await this.getDdragonVersion();

            // Get account info
            this.sendProgress('🔍 Looking up account info...', { step: 2, total: 8 });
            const accountData = await this.getAccountByRiotId(gameName, tagLine);
            if (!accountData) {
                throw new Error('Account not found');
            }
            
            data.account = accountData;
            const puuid = accountData.puuid;

            // Get summoner info (no rate limiting for lightweight calls)
            this.sendProgress('✅ Account found! Fetching summoner data...', { step: 3, total: 8 });
            const summonerData = await this.getSummonerByPuuid(puuid);
            data.summoner = summonerData;
            
            // Add profile icon URL
            if (summonerData?.profileIconId) {
                data.summoner.profileIconUrl = this.getProfileIconUrl(summonerData.profileIconId);
            }
            
            const summonerId = summonerData?.id;

            // Get ranked data and champion mastery in parallel (no rate limiting for lightweight calls)
            this.sendProgress('📊 Fetching ranked data and champion mastery...', { step: 4, total: 8 });
            const [rankedData, masteryScore, allMasteries] = await Promise.all([
                summonerId ? this.getLeagueEntries(summonerId) : Promise.resolve([]),
                this.getChampionMasteryScore(puuid),
                this.getAllChampionMasteries(puuid)
            ]);
            // Handle ranked data
            data.ranked = rankedData || [];

            if (masteryScore !== null && allMasteries) {
                // Add champion image URLs to mastery data in parallel - optimized
                const topMasteries = allMasteries.slice(0, 10);
                const championImagePromises = topMasteries.map(mastery => 
                    mastery.championId ? this.getChampionImageUrl(mastery.championId) : Promise.resolve(null)
                );
                
                const championImageUrls = await Promise.all(championImagePromises);
                
                // Assign URLs back to mastery objects
                topMasteries.forEach((mastery, index) => {
                    if (championImageUrls[index]) {
                        mastery.championImageUrl = championImageUrls[index];
                    }
                });
                
                data.championMastery = {
                    totalScore: masteryScore,
                    champions: topMasteries // Top 10 champions with image URLs
                };
            }

            // Get current game (no rate limiting for lightweight calls)
            const currentGame = await this.getCurrentGame(puuid);
            data.currentGame = currentGame;

            // Get match history with smart batching (like Python script)
            // Apply rate limiting only to heavy API calls
            
            // Valid queue types for personality analysis
            const VALID_QUEUE_IDS = new Set([420, 440, 400, 430, 490]);
            
            this.sendProgress(`📊 Fetching up to ${maxFetch} recent games for personality analysis...`, { step: 5, total: 8 });
            
            // Fetch match IDs in batches to find enough valid games
            let allMatchIds = [];
            for (let start = 0; start < maxFetch; start += 100) {
                const batchSize = Math.min(100, maxFetch - start);
                await this._delay(); // Rate limiting only for match history calls
                const batchIds = await this.getMatchIds(puuid, batchSize, start);
                if (!batchIds || batchIds.length === 0) {
                    break;
                }
                allMatchIds.push(...batchIds);
                this.sendProgress(`📥 Fetched ${allMatchIds.length} match IDs so far...`, { 
                    step: 5, 
                    total: 8,
                    matchIds: allMatchIds.length,
                    maxFetch 
                });
                
                if (allMatchIds.length >= maxFetch) {
                    break;
                }
            }
            
            data.matchIds = allMatchIds;
            
            // Get match details with early termination when we have enough valid games
            if (includeMatchDetails && allMatchIds && allMatchIds.length > 0) {
                data.matches = [];
                let validGameCount = 0;
                let rankedGames = 0;
                let normalGames = 0;
                let otherGames = 0;
                
                this.sendProgress(`✅ Found ${allMatchIds.length} total matches. Analyzing game details...`, { 
                    step: 6, 
                    total: 8,
                    totalMatches: allMatchIds.length,
                    targetAnalyze
                });
                this.sendProgress(`⏳ Looking for ${targetAnalyze} ranked/normal games...`, { step: 6, total: 8 });
                
                for (let i = 0; i < allMatchIds.length; i++) {
                    if (i % 5 === 0 && i > 0) {
                        this.sendProgress(`🔍 Progress: ${i}/${allMatchIds.length} matches analyzed`, {
                            step: 6,
                            total: 8,
                            progress: i,
                            totalMatches: allMatchIds.length,
                            validGames: validGameCount,
                            rankedGames,
                            normalGames,
                            otherGames,
                            targetAnalyze
                        });
                    }
                    
                    await this._delay(); // Rate limiting only for match details calls
                    const matchData = await this.getMatchDetails(allMatchIds[i]);
                    if (matchData) {
                        // Check if this is a valid game for analysis
                        const queueId = matchData.info?.queueId;
                        const isValidGame = VALID_QUEUE_IDS.has(queueId);
                        
                        // Categorize games for detailed reporting
                        if (queueId === 420 || queueId === 440) {
                            rankedGames++;
                        } else if (queueId === 400 || queueId === 430 || queueId === 490) {
                            normalGames++;
                        } else {
                            otherGames++;
                        }
                        
                        // Enhance match data with champion images in parallel - optimized
                        if (matchData.info && matchData.info.participants) {
                            const championIds = matchData.info.participants
                                .map(p => p.championId)
                                .filter(id => id);
                            
                            const championImagePromises = championIds.map(id => this.getChampionImageUrl(id));
                            const championImageUrls = await Promise.all(championImagePromises);
                            
                            // Create a map for quick lookup
                            const imageUrlMap = new Map();
                            championIds.forEach((id, index) => {
                                if (championImageUrls[index]) {
                                    imageUrlMap.set(id, championImageUrls[index]);
                                }
                            });
                            
                            // Assign URLs to participants
                            matchData.info.participants.forEach(participant => {
                                if (participant.championId && imageUrlMap.has(participant.championId)) {
                                    participant.championImageUrl = imageUrlMap.get(participant.championId);
                                }
                            });
                        }
                        data.matches.push(matchData);
                        
                        // Count valid games and check if we have enough
                        if (isValidGame) {
                            validGameCount++;
                            if (validGameCount >= targetAnalyze) {
                                this.sendProgress(`🎯 Reached target of ${targetAnalyze} ranked/normal games!`, {
                                    step: 6,
                                    total: 8,
                                    validGames: validGameCount,
                                    rankedGames,
                                    normalGames,
                                    otherGames,
                                    totalAnalyzed: data.matches.length,
                                    targetReached: true
                                });
                                break;
                            }
                        }
                    }
                }
                
                this.sendProgress(`📈 Analysis complete: ${data.matches.length} total matches, ${validGameCount} valid for personality analysis`, {
                    step: 6,
                    total: 8,
                    finalStats: {
                        totalMatches: data.matches.length,
                        validGames: validGameCount,
                        rankedGames,
                        normalGames,
                        otherGames
                    }
                });
            } else {
                data.matches = [];
            }

            // Add Data Dragon version to metadata
            data.metadata.ddragonVersion = this.ddragonVersion;

            return data;

        } catch (error) {
            console.error('Error fetching player data:', error);
            throw error;
        }
    }
}

module.exports = LeagueDataFetcher;
