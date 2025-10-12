import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayerDataContext } from './PlayerDataContext';

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

const SearchPage: React.FC = () => {
  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [region, setRegion] = useState('na1');
  const navigate = useNavigate();
  const context = useContext(PlayerDataContext);
  const error = context?.errorMessage || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameName.trim() || !tagLine.trim()) {
      context?.setErrorMessage('Please enter both game name and tag line');
      return;
    }
    context?.setErrorMessage('');
    context?.setPlayerData(null);
    context?.setLoadingStatus(['🔄 Starting analysis...']);
    context?.setProfileIconUrl('');
    navigate('/loading');

    try {
      // Use Server-Sent Events for real-time progress updates
      const eventSource = new EventSource(`http://localhost:5000/api/search/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}/progress?region=${region}`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'progress') {
          // Format detailed progress messages
          let message = data.message;
          
          if (data.finalStats) {
            message += ` (🏆 ${data.finalStats.rankedGames} ranked, 🎮 ${data.finalStats.normalGames} normal, 📊 ${data.finalStats.otherGames} other)`;
          } else if (data.rankedGames !== undefined) {
            message += ` (🏆 ${data.rankedGames} ranked, 🎮 ${data.normalGames} normal, 📊 ${data.otherGames} other)`;
          } else if (data.validGames !== undefined) {
            message += ` (✅ ${data.validGames}/${data.targetAnalyze} valid games)`;
          } else if (data.matchIds !== undefined) {
            message += ` (📥 ${data.matchIds}/${data.maxFetch})`;
          }
          
          context?.setLoadingStatus((prev) => [...prev, message]);
        } else if (data.type === 'complete') {
          eventSource.close();
          context?.setPlayerData(data.data);
          if (data.data.summoner?.profileIconUrl) {
            context?.setProfileIconUrl(data.data.summoner.profileIconUrl);
          }
          context?.setLoadingStatus((prev) => [...prev, '✨ Analysis complete!']);
          setTimeout(() => {
            navigate('/results');
          }, 800);
        } else if (data.type === 'error') {
          eventSource.close();
          context?.setLoadingStatus((prev) => [...prev, `❌ ${data.message}`]);
          setTimeout(() => {
            context?.setErrorMessage(data.message);
            navigate('/');
          }, 1200);
        }
      };

      eventSource.onerror = (error) => {
        eventSource.close();
        context?.setLoadingStatus((prev) => [...prev, '❌ Connection error']);
        setTimeout(() => {
          context?.setErrorMessage('Connection error occurred');
          navigate('/');
        }, 1200);
      };

    } catch (err) {
      context?.setLoadingStatus((prev) => [...prev, `❌ ${err instanceof Error ? err.message : 'An error occurred'}`]);
      setTimeout(() => {
        context?.setErrorMessage(err instanceof Error ? err.message : 'An error occurred');
        navigate('/');
      }, 1200);
    }
  };

  return (
    <div className="hero-section">
      <div className="title-container">
        <h1 className="title-shape">SHAPE</h1>
        <div className="hero-logo-wrapper">
          <img src="/logo.png" alt="ShapeSplitter" className="hero-logo" />
          {[...Array(20)].map((_, i) => (
            <div key={i} className="particle" />
          ))}
        </div>
        <h1 className="title-split">SPLIT</h1>
      </div>
      <p className="tagline">Clone. Analyze. Dominate.</p>
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
            disabled={!gameName.trim() || !tagLine.trim()}
            className="search-button"
          >
            Search
          </button>
        </form>
        {error && <div className="error-message">{error}</div>}
        {/* Clear error on input change */}
        <script dangerouslySetInnerHTML={{__html:`
          document.querySelectorAll('.search-input, .tag-input').forEach(el => {
            el.addEventListener('input', () => {
              if (window.__clearErrorTimeout) clearTimeout(window.__clearErrorTimeout);
              window.__clearErrorTimeout = setTimeout(() => {
                document.querySelector('.error-message')?.remove();
              }, 1000);
            });
          });
        `}} />
      </div>
    </div>
  );
};

export default SearchPage;
