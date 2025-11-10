import React from 'react';
import './App.css';

const HowItWorksPage: React.FC = () => {
  return (
    <div className="hero-section how-it-works-page">
      <div className="how-it-works-container">
        <div className="how-it-works-header">
          <h1 className="how-it-works-title">How It Works</h1>
          <p className="how-it-works-subtitle">
            Shape Split analyzes your League of Legends gameplay to create a comprehensive digital twin
          </p>
        </div>

        <div className="steps-container">
          {/* Step 1 */}
          <div className="step-card">
            <div className="step-number">01</div>
            <div className="step-content">
              <h3 className="step-title">Search Your Summoner</h3>
              <p className="step-description">
                Enter your Riot ID and select your region. We'll fetch your account data, ranked statistics, 
                champion mastery, and up to 100 recent matches from the Riot Games API.
              </p>
              <div className="step-details">
                <div className="detail-item">
                  <span className="detail-icon">📊</span>
                  <span>Account & Ranked Stats</span>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">🏆</span>
                  <span>Champion Mastery</span>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">🎮</span>
                  <span>Match History Analysis</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="step-card">
            <div className="step-number">02</div>
            <div className="step-content">
              <h3 className="step-title">Personality Analysis</h3>
              <p className="step-description">
                Our advanced algorithm analyzes 25+ ranked and normal games, extracting patterns from your 
                KDA, vision score, role preference, champion diversity, aggression index, and objective control.
              </p>
              <div className="step-details">
                <div className="detail-item">
                  <span className="detail-icon">🧠</span>
                  <span>Big Five Traits (0-100 scale)</span>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">🎭</span>
                  <span>Jungian Archetype Match</span>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">📈</span>
                  <span>Playstyle Metrics</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="step-card">
            <div className="step-number">03</div>
            <div className="step-content">
              <h3 className="step-title">Digital Twin Creation</h3>
              <p className="step-description">
                Powered by AWS Bedrock and Claude AI, your digital twin learns your gameplay personality, 
                champion preferences, and performance patterns to provide personalized insights.
              </p>
              <div className="step-details">
                <div className="detail-item">
                  <span className="detail-icon">🤖</span>
                  <span>AI-Powered Chat</span>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">💡</span>
                  <span>Personalized Insights</span>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">🎯</span>
                  <span>Performance Coaching</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="step-card">
            <div className="step-number">04</div>
            <div className="step-content">
              <h3 className="step-title">Duo Compatibility</h3>
              <p className="step-description">
                Find your perfect duo queue partner! Compare personality traits, playstyles, and roles with 
                other summoners. Get AI-generated compatibility scores and recommendations.
              </p>
              <div className="step-details">
                <div className="detail-item">
                  <span className="detail-icon">💘</span>
                  <span>Compatibility Score (0-100)</span>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">⚡</span>
                  <span>Synergy Analysis</span>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">🎪</span>
                  <span>Team Dynamic Insights</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Details Section */}
        <div className="technical-section">
          <h2 className="technical-title">The Science Behind It</h2>
          <div className="technical-grid">
            <div className="technical-card">
              <div className="technical-icon">🔬</div>
              <h4>Personality Mapping</h4>
              <p>
                We use the Big Five personality model (Openness, Conscientiousness, Extraversion, 
                Agreeableness, Emotional Stability) mapped to gameplay patterns through statistical analysis.
              </p>
            </div>
            <div className="technical-card">
              <div className="technical-icon">📐</div>
              <h4>Archetype Matching</h4>
              <p>
                12 Jungian archetypes are matched using Euclidean distance in 5-dimensional trait space, 
                providing similarity scores and descriptions.
              </p>
            </div>
            <div className="technical-card">
              <div className="technical-icon">🤖</div>
              <h4>AWS Bedrock AI</h4>
              <p>
                Claude 4.5 Sonnet powers conversational insights, analyzing your complete player context 
                to provide coaching and answer questions about your gameplay.
              </p>
            </div>
            <div className="technical-card">
              <div className="technical-icon">⚡</div>
              <h4>Real-Time Processing</h4>
              <p>
                Serverless architecture on Vercel ensures fast, scalable analysis. Rate-limited API calls 
                comply with Riot Games restrictions while maximizing data collection.
              </p>
            </div>
          </div>
        </div>

        {/* Example Metrics */}
        <div className="metrics-section">
          <h2 className="metrics-title">What We Analyze</h2>
          <div className="metrics-grid">
            <div className="metric-item">
              <span className="metric-label">Combat Metrics</span>
              <span className="metric-value">KDA, Deaths, Kill Participation, First Blood Rate</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Strategic Metrics</span>
              <span className="metric-value">Vision Score, Objective Focus, Champion Diversity</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Consistency</span>
              <span className="metric-value">KDA Variance, Death Variance, Role Preference</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Playstyle</span>
              <span className="metric-value">Aggression Index, Assist Ratio, Primary Role</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="how-it-works-cta">
          <h2>Ready to Meet Your Digital Twin?</h2>
          <a href="/" className="cta-button">
            Get Started
          </a>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPage;
