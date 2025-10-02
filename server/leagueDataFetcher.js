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
        this.rateLimitDelay = 1200; // 1.2 seconds
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

    async getMatchIds(puuid, count = 20) {
        const url = `https://${this.routingRegion}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids`;
        return this._makeRequest(url, { start: 0, count });
    }

    async getMatchDetails(matchId) {
        const url = `https://${this.routingRegion}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
        return this._makeRequest(url);
    }

    async getCurrentGame(puuid) {
        const url = `https://${this.region}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}`;
        return this._makeRequest(url);
    }

    async getCompletePlayerData(gameName, tagLine, matchCount = 10, includeMatchDetails = true) {
        const data = {
            metadata: {
                fetchedAt: new Date().toISOString(),
                gameName,
                tagLine,
                matchCount,
                region: this.region,
                routingRegion: this.routingRegion
            }
        };

        try {
            // Get account info
            const accountData = await this.getAccountByRiotId(gameName, tagLine);
            if (!accountData) {
                throw new Error('Account not found');
            }
            
            data.account = accountData;
            const puuid = accountData.puuid;

            // Get summoner info
            await this._delay();
            const summonerData = await this.getSummonerByPuuid(puuid);
            data.summoner = summonerData;
            const summonerId = summonerData?.id;

            // Get ranked data
            if (summonerId) {
                await this._delay();
                const rankedData = await this.getLeagueEntries(summonerId);
                data.ranked = rankedData || [];
            } else {
                data.ranked = [];
            }

            // Get champion mastery
            await this._delay();
            const [masteryScore, allMasteries] = await Promise.all([
                this.getChampionMasteryScore(puuid),
                this.getAllChampionMasteries(puuid)
            ]);

            if (masteryScore !== null && allMasteries) {
                data.championMastery = {
                    totalScore: masteryScore,
                    champions: allMasteries.slice(0, 10) // Top 10 champions
                };
            }

            // Get current game
            await this._delay();
            const currentGame = await this.getCurrentGame(puuid);
            data.currentGame = currentGame;

            // Get match history
            await this._delay();
            const matchIds = await this.getMatchIds(puuid, matchCount);
            data.matchIds = matchIds || [];

            // Get match details if requested
            if (includeMatchDetails && matchIds && matchIds.length > 0) {
                data.matches = [];
                
                for (let i = 0; i < Math.min(matchIds.length, 5); i++) { // Limit to 5 matches for performance
                    await this._delay();
                    const matchData = await this.getMatchDetails(matchIds[i]);
                    if (matchData) {
                        data.matches.push(matchData);
                    }
                }
            } else {
                data.matches = [];
            }

            return data;

        } catch (error) {
            console.error('Error fetching player data:', error);
            throw error;
        }
    }
}

module.exports = LeagueDataFetcher;
