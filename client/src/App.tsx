import React, { useContext, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PlayerDataProvider, PlayerDataContext } from './PlayerDataContext';
import SearchPage from './SearchPage';
import LoadingPage from './LoadingPage';
import ResultsPage from './ResultsPage';
import HowItWorksPage from './HowItWorksPage';
import './App.css';

function AppRoutes() {
  const context = useContext(PlayerDataContext);
  if (!context) return null;
  const { playerData, loadingStatus, profileIconUrl } = context;
  
  return (
    <Routes>
      <Route path="/" element={<SearchPage />} />
      <Route path="/loading" element={<LoadingPage profileIconUrl={profileIconUrl} loadingStatus={loadingStatus} />} />
      <Route path="/results" element={<ResultsPage playerData={playerData} />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
    </Routes>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <PlayerDataProvider>
      <Router>
        <div className="App">
          <button 
            className="menu-button" 
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <nav className={`menu ${menuOpen ? 'open' : ''}`}>
            <a href="#home" onClick={(e) => { e.preventDefault(); setMenuOpen(false); window.location.href = '/'; }}>Home</a>
            <a href="/how-it-works" onClick={(e) => { e.preventDefault(); setMenuOpen(false); window.location.href = '/how-it-works'; }}>How It Works</a>
            <a href="https://github.com/louistaii/ShapeSplit" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>GitHub Repo</a>
          </nav>

          {menuOpen && <div className="menu-overlay" onClick={() => setMenuOpen(false)} />}
          
          <AppRoutes />
        </div>
      </Router>
    </PlayerDataProvider>
  );
}

export default App;
