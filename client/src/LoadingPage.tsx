import React from 'react';

interface LoadingPageProps {
  profileIconUrl: string;
  loadingStatus: string[];
}

const LoadingPage: React.FC<LoadingPageProps> = ({ profileIconUrl, loadingStatus }) => {
  const getCurrentStep = () => {
    if (loadingStatus.length === 0) return 'Initializing...';
    return loadingStatus[loadingStatus.length - 1];
  };

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
        
        {/* Loading Message */}
        <div className="loading-message">
          <p className="loading-time-estimate">Please wait a few minutes...</p>
          <p className="loading-description">We're analyzing 25+ games to build your personality profile</p>
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
