import React from 'react';

interface LoadingPageProps {
  profileIconUrl: string;
  loadingStatus: string[];
}

const LoadingPage: React.FC<LoadingPageProps> = ({ profileIconUrl, loadingStatus }) => {
  const getProgressPercentage = () => {
    const stats = getStatsFromStatus();
    // Base progress on ranked games found out of target (25)
    const targetRankedGames = 25;
    const rankedProgress = Math.min((stats.ranked / targetRankedGames) * 100, 100);
    
    // If we have valid games analyzed, use that for final progress
    if (stats.valid > 0) {
      return Math.min((stats.valid / stats.target) * 100, 100);
    }
    
    // Otherwise use ranked games progress
    return Math.round(rankedProgress);
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
      target: validMatch ? parseInt(validMatch[2]) : 25,
      fetched: matchIdsMatch ? parseInt(matchIdsMatch[1]) : 0,
      maxFetch: matchIdsMatch ? parseInt(matchIdsMatch[2]) : 100
    };
  };

  const progress = getProgressPercentage();

  return (
    <div className="hero-section loading-page">
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

        {/* Current Step - Only Latest Message */}
        <div className="current-step">
          {getCurrentStep()}
        </div>
      </div>
    </div>
  );
};

export default LoadingPage;
