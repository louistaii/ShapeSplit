import React, { useState } from 'react';
import './App.css';

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
  ranked?: Array<{
    queueType: string;
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
  }>;
  championMastery?: {
    totalScore: number;
    champions: Array<{
      championId: number;
      championLevel: number;
      championPoints: number;
      championImageUrl?: string;
    }>;
  };
  matches?: Array<{
    metadata?: { matchId: string };
    info?: {
      gameDuration: number;
      gameMode: string;
      participants?: Array<{
        puuid: string;
        championId: number;
        championName: string;
        championImageUrl?: string;
        win: boolean;
        kills: number;
        deaths: number;
        assists: number;
      }>;
    };
  }>;
}

const regions = [
  { value: 'kr', label: 'Korea' },
  { value: 'na1', label: 'North America' },
  { value: 'euw1', label: 'Europe West' },
  { value: 'eun1', label: 'Europe Nordic & East' },
  { value: 'br1', label: 'Brazil' },
  { value: 'la1', label: 'Latin America North' },
  { value: 'la2', label: 'Latin America South' },
  { value: 'oc1', label: 'Oceania' },
  { value: 'tr1', label: 'Turkey' },
  { value: 'ru', label: 'Russia' },
  { value: 'jp1', label: 'Japan' },
];

function App() {
  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [region, setRegion] = useState('na1');
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchPlayer = async () => {
    if (!gameName.trim() || !tagLine.trim()) {
      setError('Please enter both game name and tag line');
      return;
    }

    setLoading(true);
    setError('');
    setPlayerData(null);

    try {
      const response = await fetch(`http://localhost:5000/api/search/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?region=${region}&match_count=5`);
      
      if (!response.ok) {
        throw new Error(`Player not found or API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data); // Debug log
      setPlayerData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadTestData = async () => {
    setLoading(true);
    setError('');
    setPlayerData(null);

    try {
      const response = await fetch('http://localhost:5000/api/test-images');
      
      if (!response.ok) {
        throw new Error(`Test data error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Test Data Response:', data); // Debug log
      setPlayerData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test data');
    } finally {
      setLoading(false);
    }
  };

  const testDataDragonImages = async () => {
    setLoading(true);
    setError('');
    setPlayerData(null);

    try {
      const response = await fetch('http://localhost:5000/api/test-images');
      
      if (!response.ok) {
        throw new Error(`Failed to load test data: ${response.status}`);
      }

      const data = await response.json();
      console.log('Test Data Response:', data); // Debug log
      setPlayerData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred loading test data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchPlayer();
  };

  return (
    <div className="App">
      <div className="hero-section">
        <div className="title-container">
          <h1 className="title-shape">SHAPE</h1>
          <img src="/logo.png" alt="ShapeSplitter" className="hero-logo" />
          <h1 className="title-split">SPLIT</h1>
        </div>
        <div className="search-container">
          <form onSubmit={handleSubmit} className="search-form">
            <div className="input-group">
              <input
                type="text"
                placeholder="Game Name"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="search-input"
              />
              <span className="separator">#</span>
              <input
                type="text"
                placeholder="Tag"
                value={tagLine}
                onChange={(e) => setTagLine(e.target.value)}
                className="search-input tag-input"
              />
            </div>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="region-select"
            >
              {regions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={loading}
              className="search-button"
            >
              {loading ? '...' : 'Search'}
            </button>
          </form>

          {error && <div className="error-message">{error}</div>}
        </div>

        {playerData && (
          <div className="results-container">
            <div className="player-header">
              {playerData.summoner?.profileIconUrl && (
                <div className="profile-icon">
                  <img 
                    src={playerData.summoner.profileIconUrl} 
                    alt="Profile Icon" 
                    className="profile-icon-img"
                    onError={(e) => {
                      console.log('Profile icon failed to load:', playerData.summoner?.profileIconUrl);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="player-info">
                <h2>{playerData.account?.gameName}#{playerData.account?.tagLine}</h2>
                <p>Level {playerData.summoner?.summonerLevel}</p>
              </div>
            </div>

            <div className="stats-grid">
              {playerData.ranked && playerData.ranked.length > 0 && (
                <div className="stat-card">
                  <h3>Ranked Stats</h3>
                  {playerData.ranked.map((rank, index) => (
                    <div key={index} className="rank-info">
                      <div className="rank-queue">{rank.queueType.replace('_', ' ')}</div>
                      <div className="rank-tier">{rank.tier} {rank.rank}</div>
                      <div className="rank-lp">{rank.leaguePoints} LP</div>
                      <div className="rank-wr">{rank.wins}W / {rank.losses}L ({((rank.wins / (rank.wins + rank.losses)) * 100).toFixed(1)}%)</div>
                    </div>
                  ))}
                </div>
              )}

              {playerData.championMastery && (
                <div className="stat-card">
                  <h3>Champion Mastery</h3>
                  <div className="mastery-total">
                    Total Score: {playerData.championMastery.totalScore?.toLocaleString()}
                  </div>
                  <div className="mastery-champions">
                    Champions Played: {playerData.championMastery.champions?.length}
                  </div>
                </div>
              )}

              {playerData.matches && playerData.matches.length > 0 && (
                <div className="stat-card">
                  <h3>Recent Matches ({playerData.matches.length})</h3>
                  <div className="matches-list">
                    {playerData.matches.map((match, index: number) => {
                      const participant = match.info?.participants?.find((p) => 
                        p.puuid === playerData.account?.puuid
                      );
                      
                      return (
                        <div key={match.metadata?.matchId || index} className={`match-item ${participant?.win ? 'win' : 'loss'}`}>
                          <div className="match-header">
                            <span className={`match-result ${participant?.win ? 'win' : 'loss'}`}>
                              {participant?.win ? 'Victory' : 'Defeat'}
                            </span>
                            <span className="match-duration">
                              {Math.floor((match.info?.gameDuration || 0) / 60)}m {(match.info?.gameDuration || 0) % 60}s
                            </span>
                          </div>
                          <div className="match-details">
                            <div className="champion-info">
                              {participant?.championImageUrl && (
                                <img 
                                  src={participant.championImageUrl} 
                                  alt={participant.championName || 'Champion'} 
                                  className="champion-icon"
                                  onError={(e) => {
                                    console.log('Champion icon failed to load:', participant.championImageUrl);
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              )}
                              <strong>{participant?.championName || 'Unknown'}</strong>
                            </div>
                            <div className="kda">
                              {participant?.kills || 0}/{participant?.deaths || 0}/{participant?.assists || 0}
                            </div>
                            <div className="game-mode">
                              {match.info?.gameMode || 'Unknown'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
