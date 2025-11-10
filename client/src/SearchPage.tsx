import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayerDataContext } from './PlayerDataContext';
import { getApiUrl } from './config';

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
      // Update progress messages during fetch
      context?.setLoadingStatus((prev) => [...prev, '🔍 Fetching player data...']);
      
      const response = await fetch(
        getApiUrl(`/api/search/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?region=${region}`)
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch player data');
      }
      
      context?.setLoadingStatus((prev) => [...prev, '📊 Processing match history...']);
      const data = await response.json();
      
      context?.setLoadingStatus((prev) => [...prev, '🧠 Analyzing personality...']);
      
      context?.setPlayerData(data);
      if (data.summoner?.profileIconUrl) {
        context?.setProfileIconUrl(data.summoner.profileIconUrl);
      }
      
      context?.setLoadingStatus((prev) => [...prev, '✨ Analysis complete!']);
      navigate('/results');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      context?.setLoadingStatus((prev) => [...prev, `❌ ${errorMessage}`]);
      setTimeout(() => {
        context?.setErrorMessage(errorMessage);
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
