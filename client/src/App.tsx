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
  };
  ranked?: Array<{
    queueType: string;
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
  }>;
  champion_mastery?: {
    total_score: number;
    champions: Array<{
      championId: number;
      championLevel: number;
      championPoints: number;
    }>;
  };
  matches?: Array<any>;
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
  const [region, setRegion] = useState('kr');
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
      const response = await fetch(`http://localhost:5000/api/player/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?region=${region}&match_count=5`);
      
      if (!response.ok) {
        throw new Error(`Player not found or API error: ${response.status}`);
      }

      const data = await response.json();
      setPlayerData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
      <header className="App-header">
        <div className="logo-container">
          <img src="/icon.ico" alt="ShapeSplitter" className="app-logo" />
          <h1>Shape Splitter</h1>
        </div>
      </header>

      <main className="main-content">
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
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {error && <div className="error-message">{error}</div>}
        </div>

        {playerData && (
          <div className="results-container">
            <div className="player-header">
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

              {playerData.champion_mastery && (
                <div className="stat-card">
                  <h3>Champion Mastery</h3>
                  <div className="mastery-total">
                    Total Score: {playerData.champion_mastery.total_score?.toLocaleString()}
                  </div>
                  <div className="mastery-champions">
                    Champions Played: {playerData.champion_mastery.champions?.length}
                  </div>
                </div>
              )}

              {playerData.matches && playerData.matches.length > 0 && (
                <div className="stat-card">
                  <h3>Recent Matches</h3>
                  <div className="matches-count">
                    {playerData.matches.length} recent matches loaded
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
