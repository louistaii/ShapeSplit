import React from 'react';

interface LoadingPageProps {
  profileIconUrl: string;
  loadingStatus: string[];
}

const LoadingPage: React.FC<LoadingPageProps> = ({ profileIconUrl, loadingStatus }) => {
  const getProgressPercentage = () => {
    // Calculate progress based on status messages
    const totalSteps = 8;
    const completedSteps = loadingStatus.filter(status => 
      status.includes('✓') || status.includes('✅') || status.includes('🎯') || status.includes('📈')
    ).length;
    return Math.min(Math.round((completedSteps / totalSteps) * 100), 100);
  };

  const getCurrentStep = () => {
    if (loadingStatus.length === 0) return 'Initializing...';
    return loadingStatus[loadingStatus.length - 1];
  };

  const getStatsFromStatus = () => {
    const lastStatus = loadingStatus[loadingStatus.length - 1] || '';
    
    // Extract game counts from status messages
    const rankedMatch = lastStatus.match(/🏆 (\d+) ranked/);
    const normalMatch = lastStatus.match(/🎮 (\d+) normal/);
    const otherMatch = lastStatus.match(/📊 (\d+) other/);
    const validMatch = lastStatus.match(/✅ (\d+)\/(\d+) valid games/);
    const matchIdsMatch = lastStatus.match(/📥 (\d+)\/(\d+)/);
    
    return {
      ranked: rankedMatch ? parseInt(rankedMatch[1]) : 0,
      normal: normalMatch ? parseInt(normalMatch[1]) : 0,
      other: otherMatch ? parseInt(otherMatch[1]) : 0,
      valid: validMatch ? parseInt(validMatch[1]) : 0,
      target: validMatch ? parseInt(validMatch[2]) : 50,
      fetched: matchIdsMatch ? parseInt(matchIdsMatch[1]) : 0,
      maxFetch: matchIdsMatch ? parseInt(matchIdsMatch[2]) : 100
    };
  };

  const stats = getStatsFromStatus();
  const progress = getProgressPercentage();

  return (
    <div className="hero-section">
      <div className="loading-container">
        <div className="loading-profile">
          {profileIconUrl && (
            <img src={profileIconUrl} alt="Profile Icon" className="loading-profile-icon" />
          )}
          <div className="loading-indicator">
            <div className="loading-spinner"></div>
            <span>Analyzing...</span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="progress-text">{progress}% Complete</span>
        </div>

        {/* Current Step */}
        <div className="current-step">
          {getCurrentStep()}
        </div>

        {/* Game Statistics */}
        {(stats.ranked > 0 || stats.normal > 0 || stats.other > 0) && (
          <div className="game-stats">
            <h4>📊 Game Analysis Progress</h4>
            <div className="stats-grid">
              {stats.ranked > 0 && (
                <div className="stat-item ranked">
                  <span className="stat-icon">🏆</span>
                  <span className="stat-label">Ranked</span>
                  <span className="stat-value">{stats.ranked}</span>
                </div>
              )}
              {stats.normal > 0 && (
                <div className="stat-item normal">
                  <span className="stat-icon">🎮</span>
                  <span className="stat-label">Normal</span>
                  <span className="stat-value">{stats.normal}</span>
                </div>
              )}
              {stats.other > 0 && (
                <div className="stat-item other">
                  <span className="stat-icon">📊</span>
                  <span className="stat-label">Other</span>
                  <span className="stat-value">{stats.other}</span>
                </div>
              )}
              {stats.valid > 0 && (
                <div className="stat-item valid">
                  <span className="stat-icon">✅</span>
                  <span className="stat-label">Valid for Analysis</span>
                  <span className="stat-value">{stats.valid}/{stats.target}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detailed Status Log */}
        <div className="loading-status-list">
          {loadingStatus.map((status, idx) => (
            <div key={idx} className="loading-status-item">
              {status}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingPage;
