const { Counter } = require('./utils');

class PersonalityAnalyzer {
    constructor() {
        this.VALID_QUEUE_IDS = new Set([420, 440, 400, 430, 490]);
        this.QUEUE_NAMES = {
            420: "Ranked Solo/Duo",
            440: "Ranked Flex", 
            400: "Normal Draft",
            430: "Normal Blind",
            490: "Normal Quickplay"
        };

        this.JUNGIAN_ARCHETYPES = {
            "Innocent": {
                "traits": {"Extraversion": 45, "Openness": 50, "Agreeableness": 80, "Conscientiousness": 70, "Emotional Stability": 65},
                "champions": ["Lulu", "Soraka"],
                "description": "Optimistic and cautious, avoids risks and helps teammates"
            },
            "Orphan": {
                "traits": {"Extraversion": 55, "Openness": 55, "Agreeableness": 75, "Conscientiousness": 55, "Emotional Stability": 55},
                "champions": ["Amumu", "Maokai"],
                "description": "Balanced team player, seeks connection and reliable performance"
            },
            "Hero": {
                "traits": {"Extraversion": 90, "Openness": 55, "Agreeableness": 60, "Conscientiousness": 75, "Emotional Stability": 70},
                "champions": ["Garen", "Darius"],
                "description": "Fearless frontline warrior, disciplined and victory-driven"
            },
            "Caregiver": {
                "traits": {"Extraversion": 50, "Openness": 50, "Agreeableness": 95, "Conscientiousness": 65, "Emotional Stability": 65},
                "champions": ["Janna", "Nami"],
                "description": "Selfless support main, prioritizes team survival above personal glory"
            },
            "Explorer": {
                "traits": {"Extraversion": 80, "Openness": 85, "Agreeableness": 50, "Conscientiousness": 50, "Emotional Stability": 55},
                "champions": ["Taliyah", "Bard"],
                "description": "Adventurous experimenter, constantly trying new strategies and champions"
            },
            "Rebel": {
                "traits": {"Extraversion": 95, "Openness": 75, "Agreeableness": 45, "Conscientiousness": 45, "Emotional Stability": 50},
                "champions": ["Yasuo", "Draven"],
                "description": "High-risk solo player, ignores meta and plays aggressively"
            },
            "Lover": {
                "traits": {"Extraversion": 85, "Openness": 65, "Agreeableness": 90, "Conscientiousness": 60, "Emotional Stability": 60},
                "champions": ["Xayah", "Rakan"],
                "description": "Passionate duo player, excels with coordination and synergy"
            },
            "Creator": {
                "traits": {"Extraversion": 50, "Openness": 90, "Agreeableness": 50, "Conscientiousness": 70, "Emotional Stability": 65},
                "champions": ["Viktor", "Heimerdinger"],
                "description": "Big-brain strategist, builds innovative win conditions"
            },
            "Jester": {
                "traits": {"Extraversion": 90, "Openness": 70, "Agreeableness": 50, "Conscientiousness": 45, "Emotional Stability": 50},
                "champions": ["Teemo", "Shaco"],
                "description": "Chaotic trickster, plays for entertainment and enemy frustration"
            },
            "Sage": {
                "traits": {"Extraversion": 60, "Openness": 65, "Agreeableness": 60, "Conscientiousness": 75, "Emotional Stability": 70},
                "champions": ["Ryze", "Orianna"],
                "description": "Disciplined perfectionist, masters fundamentals through practice"
            },
            "Magician": {
                "traits": {"Extraversion": 75, "Openness": 75, "Agreeableness": 60, "Conscientiousness": 75, "Emotional Stability": 70},
                "champions": ["Twisted Fate", "Zed"],
                "description": "Versatile playmaker, adapts to carry games from any position"
            },
            "Ruler": {
                "traits": {"Extraversion": 65, "Openness": 55, "Agreeableness": 70, "Conscientiousness": 80, "Emotional Stability": 75},
                "champions": ["Galio", "Shen"],
                "description": "Strategic macro player, controls vision and map objectives"
            }
        };
    }

    extractPlayerStats(matches, puuid) {
        const stats = {
            roles: [], visionScores: [], kdas: [], deaths: [],
            champions: [], kills: [], assists: [], gameDurations: [],
            totalObjectives: 0, firstBloods: 0, killParticipationSum: 0,
            queueTypes: [], matchIds: []
        };

        let validGames = 0;
        
        for (const match of matches.filter(Boolean)) {
            const info = match.info || {};
            const queueId = info.queueId;
            
            // Filter for ranked/normal games only
            if (!this.VALID_QUEUE_IDS.has(queueId)) {
                continue;
            }
                
            const playerData = info.participants?.find(p => p.puuid === puuid);
            if (!playerData) continue;

            validGames++;
            const gameDuration = (info.gameDuration || 1) / 60;
            stats.gameDurations.push(gameDuration);
            stats.roles.push(playerData.teamPosition || "UNKNOWN");
            stats.champions.push(playerData.championName || "Unknown");
            stats.queueTypes.push(this.QUEUE_NAMES[queueId] || `Queue ${queueId}`);
            stats.matchIds.push(match.metadata?.matchId || "Unknown");

            const kills = playerData.kills || 0;
            const deaths = playerData.deaths || 0;
            const assists = playerData.assists || 0;

            stats.kills.push(kills);
            stats.deaths.push(deaths);
            stats.assists.push(assists);
            stats.kdas.push((kills + assists) / Math.max(1, deaths));
            stats.visionScores.push(playerData.visionScore || 0);

            stats.totalObjectives += (playerData.dragonKills || 0) + 
                                   (playerData.baronKills || 0) + 
                                   (playerData.turretKills || 0);

            if (playerData.firstBloodKill) {
                stats.firstBloods++;
            }

            const teamId = playerData.teamId;
            const teamKills = info.participants
                ?.filter(p => p.teamId === teamId)
                ?.reduce((sum, p) => sum + (p.kills || 0), 0) || 1;
            
            if (teamKills > 0) {
                stats.killParticipationSum += (kills + assists) / teamKills;
            }
        }

        console.log(`✅ Analyzed ${validGames} valid ranked/normal games`);
        return { stats, validGames };
    }

    calculateFeatures(stats) {
        const numGames = stats.kdas.length;
        if (numGames === 0) return {};

        const avgKills = this.mean(stats.kills);
        const avgDeaths = this.mean(stats.deaths);
        const avgAssists = this.mean(stats.assists);
        const avgDuration = this.mean(stats.gameDurations);
        const killParticipation = (stats.killParticipationSum / numGames) * 100;

        // Aggression Index: (#kills + kill participation) / (deaths + assists)
        const aggressionIndex = (avgKills + (killParticipation / 100)) / Math.max(1, avgDeaths + avgAssists);

        const roleCounts = this.countArray(stats.roles);
        const primaryRole = roleCounts.length > 0 ? roleCounts[0][0] : "UNKNOWN";

        return {
            primaryRole,
            visionPerMin: this.mean(stats.visionScores) / avgDuration,
            aggressionIndex,
            kdaVariance: this.standardDeviation(stats.kdas),
            deathVariance: this.standardDeviation(stats.deaths),
            objectiveFocus: stats.totalObjectives / numGames,
            championDiversity: new Set(stats.champions).size / numGames,
            killParticipation,
            firstBloodRate: stats.firstBloods / numGames,
            assistRatio: avgAssists / Math.max(1, avgKills),
            avgDeaths,
            avgKills,
            avgAssists,
            avgKda: this.mean(stats.kdas),
        };
    }

    mapToBigFive(features) {
        const traits = {
            "Openness": 50.0, 
            "Conscientiousness": 50.0, 
            "Extraversion": 50.0,
            "Agreeableness": 50.0, 
            "Emotional Stability": 50.0
        };
        
        const calculations = {
            "Openness": [], 
            "Conscientiousness": [], 
            "Extraversion": [],
            "Agreeableness": [], 
            "Emotional Stability": []
        };

        // Openness: Linked to champion diversity and creative/roaming roles (Mid)
        const diversityBonus = (features.championDiversity || 0) * 40;
        traits["Openness"] += diversityBonus;
        calculations["Openness"].push(`Champion diversity: +${diversityBonus.toFixed(1)} (${(features.championDiversity || 0).toFixed(2)} × 40)`);
        
        if (features.primaryRole === "MIDDLE") {
            traits["Openness"] += 15;
            calculations["Openness"].push("Mid role: +15.0");
        } else if (["BOTTOM", "UTILITY"].includes(features.primaryRole)) {
            traits["Openness"] -= 10;
            calculations["Openness"].push(`${features.primaryRole} role: -10.0`);
        }

        // Conscientiousness: Linked to consistency (low variance) and precision roles (ADC)
        // REBALANCED: Reduced penalties and added KDA bonus to balance
        const deathPenalty = Math.max(0, (features.avgDeaths || 5) - 3) * 2.0; // Only penalize deaths above 3
        traits["Conscientiousness"] -= deathPenalty;
        calculations["Conscientiousness"].push(`Avg deaths penalty: -${deathPenalty.toFixed(1)} (max(0, ${(features.avgDeaths || 0).toFixed(2)} - 3) × 2.0)`);
        
        const kdaVarPenalty = (features.kdaVariance || 0) * 2.5; // Reduced from 4
        traits["Conscientiousness"] -= kdaVarPenalty;
        calculations["Conscientiousness"].push(`KDA variance penalty: -${kdaVarPenalty.toFixed(1)} (${(features.kdaVariance || 0).toFixed(2)} × 2.5)`);
        
        const deathVarPenalty = (features.deathVariance || 0) * 2; // Reduced from 3
        traits["Conscientiousness"] -= deathVarPenalty;
        calculations["Conscientiousness"].push(`Death variance penalty: -${deathVarPenalty.toFixed(1)} (${(features.deathVariance || 0).toFixed(2)} × 2)`);
        
        // Add KDA bonus to reward good play
        const kdaBonus = Math.min(20, (features.avgKda || 0) * 5); // Cap at +20
        traits["Conscientiousness"] += kdaBonus;
        calculations["Conscientiousness"].push(`KDA bonus: +${kdaBonus.toFixed(1)} (min(20, ${(features.avgKda || 0).toFixed(2)} × 5))`);
        
        if (features.primaryRole === "BOTTOM") {
            traits["Conscientiousness"] += 15; // Reduced from 20 since we added KDA bonus
            calculations["Conscientiousness"].push("ADC role: +15.0");
        }

        // Extraversion: Linked to aggression, roaming, and high-action roles (Jungle/Mid)
        const kpBonus = (features.killParticipation || 0) * 0.4;
        traits["Extraversion"] += kpBonus;
        calculations["Extraversion"].push(`Kill participation: +${kpBonus.toFixed(1)} (${(features.killParticipation || 0).toFixed(1)}% × 0.4)`);
        
        const aggroBonus = (features.aggressionIndex || 0) * 20;
        traits["Extraversion"] += aggroBonus;
        calculations["Extraversion"].push(`Aggression index: +${aggroBonus.toFixed(1)} (${(features.aggressionIndex || 0).toFixed(2)} × 20)`);
        
        const fbBonus = (features.firstBloodRate || 0) * 25;
        traits["Extraversion"] += fbBonus;
        calculations["Extraversion"].push(`First blood rate: +${fbBonus.toFixed(1)} (${(features.firstBloodRate || 0).toFixed(2)} × 25)`);
        
        if (["JUNGLE", "MIDDLE"].includes(features.primaryRole)) {
            traits["Extraversion"] += 15;
            calculations["Extraversion"].push(`${features.primaryRole} role: +15.0`);
        } else if (features.primaryRole === "TOP") {
            traits["Extraversion"] -= 15;
            calculations["Extraversion"].push("Top role: -15.0");
        }

        // Agreeableness: Linked to supportive actions (assists, vision) and roles (Support, Jungle)
        // REBALANCED: Reduced multipliers to avoid everyone having high Agreeableness
        const assistBonus = Math.min(25, (features.assistRatio || 0) * 15); // Reduced from 20, capped at 25
        traits["Agreeableness"] += assistBonus;
        calculations["Agreeableness"].push(`Assist ratio: +${assistBonus.toFixed(1)} (${(features.assistRatio || 0).toFixed(2)} × 15, max 25)`);
        
        const visionBonus = Math.min(15, (features.visionPerMin || 0) * 7); // Reduced from 10, capped at 15
        traits["Agreeableness"] += visionBonus;
        calculations["Agreeableness"].push(`Vision/min: +${visionBonus.toFixed(1)} (${(features.visionPerMin || 0).toFixed(2)} × 7, max 15)`);
        
        // Penalize selfish play (low assist ratio)
        if ((features.assistRatio || 0) < 0.5) {
            const selfishPenalty = (0.5 - (features.assistRatio || 0)) * 30;
            traits["Agreeableness"] -= selfishPenalty;
            calculations["Agreeableness"].push(`Low assist penalty: -${selfishPenalty.toFixed(1)}`);
        }
        
        if (features.primaryRole === "UTILITY") {
            traits["Agreeableness"] += 25;
            calculations["Agreeableness"].push("Support role: +25.0");
        } else if (features.primaryRole === "JUNGLE") {
            traits["Agreeableness"] += 10; // Reduced from 15
            calculations["Agreeableness"].push("Jungle role: +10.0");
        } else if (features.primaryRole === "MIDDLE") {
            traits["Agreeableness"] -= 10; // Reduced penalty
            calculations["Agreeableness"].push("Mid role: -10.0");
        } else if (features.primaryRole === "TOP") {
            traits["Agreeableness"] -= 5;
            calculations["Agreeableness"].push("Top role: -5.0");
        }

        // Emotional Stability: Linked to low variance (consistency) and objective control
        // REBALANCED: Reduced variance penalties and boosted objective bonus
        const kdaStabPenalty = (features.kdaVariance || 0) * 3; // Reduced from 5
        traits["Emotional Stability"] -= kdaStabPenalty;
        calculations["Emotional Stability"].push(`KDA variance penalty: -${kdaStabPenalty.toFixed(1)} (${(features.kdaVariance || 0).toFixed(2)} × 3)`);
        
        const deathStabPenalty = (features.deathVariance || 0) * 2.5; // Reduced from 4
        traits["Emotional Stability"] -= deathStabPenalty;
        calculations["Emotional Stability"].push(`Death variance penalty: -${deathStabPenalty.toFixed(1)} (${(features.deathVariance || 0).toFixed(2)} × 2.5)`);
        
        const objBonus = (features.objectiveFocus || 0) * 8; // Doubled from 4 to 8
        traits["Emotional Stability"] += objBonus;
        calculations["Emotional Stability"].push(`Objective focus: +${objBonus.toFixed(1)} (${(features.objectiveFocus || 0).toFixed(2)} × 8)`);
        
        // Add KDA consistency bonus (reward high KDA with low variance)
        const kdaConsistency = features.avgKda > 2.0 && features.kdaVariance < 2.0;
        if (kdaConsistency) {
            traits["Emotional Stability"] += 10;
            calculations["Emotional Stability"].push("KDA consistency bonus: +10.0");
        }
        
        if (features.primaryRole === "JUNGLE") {
            traits["Emotional Stability"] += 10;
            calculations["Emotional Stability"].push("Jungle role: +10.0");
        }
            
        // Normalize all traits to be within the 0-100 range
        for (const trait in traits) {
            const original = traits[trait];
            traits[trait] = Math.max(0, Math.min(100, Math.round(traits[trait] * 10) / 10));
            if (original !== traits[trait]) {
                calculations[trait].push(`Normalized from ${original.toFixed(1)} to ${traits[trait].toFixed(1)}`);
            }
        }
            
        return { traits, calculations };
    }

    matchArchetype(bigFive) {
        let bestMatch = null;
        let minDistance = Infinity;

        for (const [archetype, data] of Object.entries(this.JUNGIAN_ARCHETYPES)) {
            const distance = Math.sqrt(
                Object.entries(data.traits).reduce((sum, [trait, value]) => {
                    return sum + Math.pow((bigFive[trait] || 50) - value, 2);
                }, 0)
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = archetype;
            }
        }
            
        // Convert distance to a more intuitive similarity score
        // Max possible distance is sqrt(3 * 100^2) approx 173. We scale this to a 0-100% similarity.
        const similarity = Math.max(0, 100 - (minDistance / 173 * 100));
        return { archetype: bestMatch, similarity };
    }

    analyzePersonality(matches, puuid) {
        console.log("🧠 Starting personality analysis...");
        
        const { stats, validGames } = this.extractPlayerStats(matches, puuid);
        
        if (validGames === 0) {
            throw new Error("No valid ranked/normal games found for analysis");
        }

        const features = this.calculateFeatures(stats);
        const { traits, calculations } = this.mapToBigFive(features);
        const { archetype, similarity } = this.matchArchetype(traits);

        return {
            stats: {
                validGames,
                rawStats: stats,
                features
            },
            personality: {
                bigFive: traits,
                calculations,
                archetype: {
                    name: archetype,
                    similarity: Math.round(similarity * 10) / 10,
                    description: this.JUNGIAN_ARCHETYPES[archetype]?.description || "",
                    champions: this.JUNGIAN_ARCHETYPES[archetype]?.champions || []
                }
            }
        };
    }

    // Utility methods
    mean(array) {
        return array.length > 0 ? array.reduce((a, b) => a + b, 0) / array.length : 0;
    }

    standardDeviation(array) {
        if (array.length <= 1) return 0;
        const mean = this.mean(array);
        const variance = array.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (array.length - 1);
        return Math.sqrt(variance);
    }

    countArray(array) {
        const counts = {};
        array.forEach(item => counts[item] = (counts[item] || 0) + 1);
        return Object.entries(counts).sort(([,a], [,b]) => b - a);
    }
}

module.exports = PersonalityAnalyzer;
