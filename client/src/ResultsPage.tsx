import React from 'react';

interface Match {
  metadata?: { matchId: string };
  info?: {
    gameDuration: number;
    gameMode: string;
    participants?: Array<Participant>;
  };
}

interface Participant {
  puuid: string;
  championId: number;
  championName: string;
  championImageUrl?: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
}

interface PersonalityData {
  stats?: {
    validGames: number;
    features: {
      primaryRole: string;
      championDiversity: number;
      aggressionIndex: number;
      killParticipation: number;
      visionPerMin: number;
      avgKda: number;
      [key: string]: any;
    };
  };
  personality?: {
    bigFive: {
      [trait: string]: number;
    };
    archetype: {
      name: string;
      similarity: number;
      description: string;
      champions: string[];
    };
  };
  error?: string;
}

interface PlayerData {
  account?: {
    gameName: string;
    tagLine: string;
    puuid: string;
  };
  summoner?: {
    summonerLevel: number;
    profileIconId: number;
    profileIconUrl?: string;
  };
  ranked?: Array<any>;
  championMastery?: any;
  matches?: Match[];
  personality?: PersonalityData;
}

interface ResultsPageProps {
  playerData: PlayerData | null;
}

function getStatsByGameMode(matches: Match[] = [], puuid: string) {
  if (!matches || matches.length === 0) return {};
  
  // Map technical game mode names to user-friendly names
  const gameModeMap: { [key: string]: string } = {
    'CLASSIC': 'Ranked Solo/Duo',
    'CHERRY': 'Arena',
    'ARAM': 'ARAM',
    'URF': 'URF',
    'NEXUSBLITZ': 'Nexus Blitz',
    'ONEFORALL': 'One For All',
    'ASCENSION': 'Ascension',
    'KINGPORO': 'King Poro',
    'SIEGE': 'Nexus Siege',
    'TUTORIAL': 'Tutorial',
    'DOOMBOTSTEEMO': 'Doom Bots',
    'STARGUARDIAN': 'Star Guardian',
    'PROJECT': 'Project',
    'GAMEMODEX': 'Game Mode X',
    'ODYSSEY': 'Odyssey',
    'SNOWURF': 'Snow URF'
  };
  
  const statsByMode: { [key: string]: { kills: number[], deaths: number[], assists: number[], wins: number, total: number } } = {};
  
  matches.forEach((match) => {
    const gameMode = match.info?.gameMode || 'Unknown';
    const friendlyName = gameModeMap[gameMode] || gameMode;
    const p = match.info?.participants?.find((x) => x.puuid === puuid);
    if (p) {
      if (!statsByMode[friendlyName]) {
        statsByMode[friendlyName] = { kills: [], deaths: [], assists: [], wins: 0, total: 0 };
      }
      statsByMode[friendlyName].kills.push(p.kills);
      statsByMode[friendlyName].deaths.push(p.deaths);
      statsByMode[friendlyName].assists.push(p.assists);
      statsByMode[friendlyName].total++;
      if (p.win) statsByMode[friendlyName].wins++;
    }
  });
  
  // Calculate averages for each mode
  const result: { [key: string]: any } = {};
  Object.keys(statsByMode).forEach(mode => {
    const stats = statsByMode[mode];
    result[mode] = {
      avgKills: (stats.kills.reduce((a, b) => a + b, 0) / stats.total).toFixed(1),
      avgDeaths: (stats.deaths.reduce((a, b) => a + b, 0) / stats.total).toFixed(1),
      avgAssists: (stats.assists.reduce((a, b) => a + b, 0) / stats.total).toFixed(1),
      winRate: ((stats.wins / stats.total) * 100).toFixed(1),
      gamesPlayed: stats.total,
    };
  });
  
  return result;
}

function getLatestUniquePlayers(matches: Match[] = [], puuid: string) {
  const seen = new Set();
  const players: { puuid: string; summonerName: string; championName: string; championImageUrl?: string }[] = [];
  
  for (const match of matches || []) {
    for (const p of match.info?.participants || []) {
      if (p.puuid !== puuid && !seen.has(p.puuid)) {
        seen.add(p.puuid);
        // Extract summoner name from riotIdGameName or use a fallback
        const summonerName = (p as any).riotIdGameName || (p as any).summonerName || `Player${players.length + 1}`;
        players.push({
          puuid: p.puuid,
          summonerName: summonerName,
          championName: p.championName,
          championImageUrl: p.championImageUrl
        });
        if (players.length === 10) return players;
      }
    }
  }
  return players;
}

const ResultsPage: React.FC<ResultsPageProps> = ({ playerData }) => {
  if (!playerData) return null;
  const puuid = playerData.account?.puuid || '';
  const statsByMode = getStatsByGameMode(playerData.matches, puuid);
  const latestPlayers = getLatestUniquePlayers(playerData.matches, puuid);

  return (
    <div className="hero-section">
      <div className="results-container">
        <div className="results-header">
          {playerData.summoner?.profileIconUrl && (
            <img src={playerData.summoner.profileIconUrl} alt="Profile Icon" className="profile-icon-img" />
          )}
          <div className="player-basic">
            <h2 className="player-name">{playerData.account?.gameName}#{playerData.account?.tagLine}</h2>
            <p className="player-level">Level {playerData.summoner?.summonerLevel}</p>
          </div>
        </div>
        
        <div className="stats-grid">
          {/* Personality Analysis Section */}
          {playerData.personality && !playerData.personality.error && (
            <>
              <div className="personality-card archetype-card">
                <h3>🎭 Personality Archetype</h3>
                <div className="archetype-content">
                  <div className="archetype-name">{playerData.personality.personality?.archetype.name}</div>
                  <div className="archetype-similarity">{playerData.personality.personality?.archetype.similarity}% match</div>
                  <div className="archetype-description">{playerData.personality.personality?.archetype.description}</div>
                  <div className="archetype-champions">
                    <strong>Similar Champions:</strong> {playerData.personality.personality?.archetype.champions.join(', ')}
                  </div>
                </div>
              </div>

              <div className="personality-card traits-card">
                <h3>🧠 Big Five Traits</h3>
                <div className="traits-content">
                  {playerData.personality.personality?.bigFive && Object.entries(playerData.personality.personality.bigFive)
                    .sort(([,a], [,b]) => b - a)
                    .map(([trait, score]) => (
                      <div key={trait} className="trait-bar">
                        <div className="trait-label">{trait}</div>
                        <div className="trait-progress">
                          <div 
                            className="trait-fill" 
                            style={{ width: `${score}%` }}
                          ></div>
                        </div>
                        <div className="trait-score">{score}/100</div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="personality-card gameplay-card">
                <h3>🎮 Gameplay Insights</h3>
                <div className="gameplay-content">
                  {playerData.personality.stats?.features && (
                    <>
                      <div className="insight-item">
                        <span>Primary Role:</span> 
                        <span className="insight-value">{playerData.personality.stats.features.primaryRole?.replace('UTILITY', 'Support').replace('BOTTOM', 'ADC')}</span>
                      </div>
                      <div className="insight-item">
                        <span>Champion Diversity:</span> 
                        <span className="insight-value">{(playerData.personality.stats.features.championDiversity * 100).toFixed(0)}%</span>
                      </div>
                      <div className="insight-item">
                        <span>Aggression Index:</span> 
                        <span className="insight-value">{playerData.personality.stats.features.aggressionIndex.toFixed(2)}</span>
                      </div>
                      <div className="insight-item">
                        <span>Kill Participation:</span> 
                        <span className="insight-value">{playerData.personality.stats.features.killParticipation.toFixed(1)}%</span>
                      </div>
                      <div className="insight-item">
                        <span>Vision Per Minute:</span> 
                        <span className="insight-value">{playerData.personality.stats.features.visionPerMin.toFixed(1)}</span>
                      </div>
                      <div className="insight-item">
                        <span>Average KDA:</span> 
                        <span className="insight-value">{playerData.personality.stats.features.avgKda.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {playerData.personality?.error && (
            <div className="personality-card error-card">
              <h3>⚠️ Personality Analysis</h3>
              <div className="error-content">
                Analysis failed: {playerData.personality.error}
              </div>
            </div>
          )}

          {/* Existing stats cards */}
          {Object.keys(statsByMode).length > 0 ? (
            Object.entries(statsByMode).map(([gameMode, stats]) => (
              <div key={gameMode} className="stat-card">
                <h3>{gameMode}</h3>
                <p className="stats-subtitle">{stats.gamesPlayed} games played</p>
                <div className="mode-stats">
                  <div className="avg-kda">K/D/A: {stats.avgKills} / {stats.avgDeaths} / {stats.avgAssists}</div>
                  <div className="win-rate">Win Rate: {stats.winRate}%</div>
                </div>
              </div>
            ))
          ) : (
            <div className="stat-card">
              <h3>No Match Data</h3>
              <div className="no-data">No recent matches found</div>
            </div>
          )}
          
          <div className="stat-card">
            <h3>Recent Players</h3>
            <p className="stats-subtitle">Latest 10 opponents/teammates</p>
            {latestPlayers.length > 0 ? (
              <div className="players-list">
                {latestPlayers.map((player, i) => (
                  <div key={player.puuid || i} className="player-item">
                    {player.championImageUrl && (
                      <img src={player.championImageUrl} alt={player.championName} className="champion-icon" />
                    )}
                    <div className="player-info-item">
                      <span className="player-name-small">{player.summonerName}</span>
                      <span className="champion-name-small">{player.championName}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">No recent players found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
