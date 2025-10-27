import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';

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

interface Card {
  id: string;
  title: string;
  component: React.ReactNode;
}

function getStatsByGameMode(matches: Match[] = [], puuid: string) {
  if (!matches || matches.length === 0) return {};
  
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
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCardData, setShareCardData] = useState<{ title: string; content: string } | null>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  
  // Calculate cards length early for useEffect dependency
  const cardsLength = React.useMemo(() => {
    if (!playerData) return 0;
    
    let count = 1; // welcome card
    
    // Add personality cards count
    if (playerData.personality && !playerData.personality.error) {
      count += 3; // archetype, traits, gameplay
    }
    
    // Add game mode cards count
    const puuid = playerData.account?.puuid || '';
    const statsByMode = getStatsByGameMode(playerData.matches, puuid);
    count += Object.keys(statsByMode).length;
    
    // Add recent players card count
    const latestPlayers = getLatestUniquePlayers(playerData.matches, puuid);
    if (latestPlayers.length > 0) {
      count += 1;
    }
    
    return count;
  }, [playerData]);
  
  // Keyboard navigation - must be called at top level
  useEffect(() => {
    if (!playerData || cardsLength === 0) return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentCardIndex((prev) => (prev - 1 + cardsLength) % cardsLength);
      }
      if (e.key === 'ArrowRight') {
        setCurrentCardIndex((prev) => (prev + 1) % cardsLength);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cardsLength, playerData]);
  
  if (!playerData) return null;
  
  const puuid = playerData.account?.puuid || '';
  const statsByMode = getStatsByGameMode(playerData.matches, puuid);
  const latestPlayers = getLatestUniquePlayers(playerData.matches, puuid);

  // Create cards array
  const cards: Card[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      component: (
        <div className="wrapped-card welcome-card">
          <div className="wrapped-card-content">
            <div className="welcome-content">
              <div className="player-profile">
                {playerData.summoner?.profileIconUrl && (
                  <img src={playerData.summoner.profileIconUrl} alt="Profile Icon" className="welcome-profile-icon" />
                )}
                <h1 className="welcome-title">Your League Wrapped</h1>
                <h2 className="welcome-name">{playerData.account?.gameName}#{playerData.account?.tagLine}</h2>
                <p className="welcome-level">Level {playerData.summoner?.summonerLevel}</p>
              </div>
              <div className="welcome-stats">
                <div className="welcome-stat">
                  <span className="stat-number">{playerData.matches?.length || 0}</span>
                  <span className="stat-label">Games Analyzed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  // Add personality cards if available
  if (playerData.personality && !playerData.personality.error) {
    cards.push({
      id: 'archetype',
      title: 'Archetype',
      component: (
        <div className="wrapped-card archetype-card">
          <div className="wrapped-card-content">
            <h3 className="card-title">🎭 Your Personality</h3>
            <div className="archetype-display">
              <div className="archetype-name">{playerData.personality.personality?.archetype.name}</div>
              <div className="archetype-similarity">{playerData.personality.personality?.archetype.similarity}% match</div>
              <div className="archetype-description">{playerData.personality.personality?.archetype.description}</div>
              <div className="archetype-champions">
                <strong>Similar Champions:</strong><br/>
                {playerData.personality.personality?.archetype.champions.join(', ')}
              </div>
            </div>
          </div>
        </div>
      )
    });

    cards.push({
      id: 'traits',
      title: 'Traits',
      component: (
        <div className="wrapped-card traits-card">
          <div className="wrapped-card-content">
            <h3 className="card-title">🧠 Your Big Five</h3>
            <div className="traits-display">
              {playerData.personality.personality?.bigFive && Object.entries(playerData.personality.personality.bigFive)
                .sort(([,a], [,b]) => b - a)
                .map(([trait, score]) => (
                  <div key={trait} className="trait-item">
                    <div className="trait-name">{trait}</div>
                    <div className="trait-bar">
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
        </div>
      )
    });

    cards.push({
      id: 'gameplay',
      title: 'Gameplay',
      component: (
        <div className="wrapped-card gameplay-card">
          <div className="wrapped-card-content">
            <h3 className="card-title">🎮 Your Playstyle</h3>
            <div className="gameplay-display">
              {playerData.personality.stats?.features && (
                <div className="gameplay-stats">
                  <div className="primary-role">
                    <span className="role-label">You're a</span>
                    <span className="role-name">{playerData.personality.stats.features.primaryRole?.replace('UTILITY', 'Support').replace('BOTTOM', 'ADC')}</span>
                    <span className="role-label">main</span>
                  </div>
                  <div className="gameplay-insights">
                    <div className="insight">
                      <span className="insight-value">{(playerData.personality.stats.features.championDiversity * 100).toFixed(0)}%</span>
                      <span className="insight-label">Champion Diversity</span>
                    </div>
                    <div className="insight">
                      <span className="insight-value">{playerData.personality.stats.features.aggressionIndex.toFixed(1)}</span>
                      <span className="insight-label">Aggression Index</span>
                    </div>
                    <div className="insight">
                      <span className="insight-value">{playerData.personality.stats.features.avgKda.toFixed(2)}</span>
                      <span className="insight-label">Average KDA</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    });
  }

  // Add game mode cards
  if (Object.keys(statsByMode).length > 0) {
    Object.entries(statsByMode).forEach(([gameMode, stats]) => {
      cards.push({
        id: `gamemode-${gameMode}`,
        title: gameMode,
        component: (
          <div className="wrapped-card gamemode-card">
            <div className="wrapped-card-content">
              <h3 className="card-title">{gameMode}</h3>
              <div className="gamemode-display">
                <div className="games-played">
                  <span className="big-number">{stats.gamesPlayed}</span>
                  <span className="big-label">Games Played</span>
                </div>
                <div className="kda-display">
                  <div className="kda-numbers">
                    <span className="kda-value">{stats.avgKills}</span>
                    <span className="kda-separator">/</span>
                    <span className="kda-value">{stats.avgDeaths}</span>
                    <span className="kda-separator">/</span>
                    <span className="kda-value">{stats.avgAssists}</span>
                  </div>
                  <span className="kda-label">Average K/D/A</span>
                </div>
                <div className="winrate-display">
                  <span className="winrate-number">{stats.winRate}%</span>
                  <span className="winrate-label">Win Rate</span>
                </div>
              </div>
            </div>
          </div>
        )
      });
    });
  }

  // Add recent players card
  if (latestPlayers.length > 0) {
    cards.push({
      id: 'players',
      title: 'Players',
      component: (
        <div className="wrapped-card players-card">
          <div className="wrapped-card-content">
            <h3 className="card-title">🤝 Recent Players</h3>
            <div className="players-display">
              <div className="players-grid">
                {latestPlayers.slice(0, 6).map((player, i) => (
                  <div key={player.puuid || i} className="player-card">
                    {player.championImageUrl && (
                      <img src={player.championImageUrl} alt={player.championName} className="player-champion-icon" />
                    )}
                    <div className="player-details">
                      <span className="player-name">{player.summonerName}</span>
                      <span className="player-champion">{player.championName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )
    });
  }

  // Navigation functions
  const nextCard = () => {
    setCurrentCardIndex((prev) => (prev + 1) % cards.length);
  };

  const prevCard = () => {
    setCurrentCardIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const goToCard = (index: number) => {
    setCurrentCardIndex(index);
  };

  // Share functions
  const handleShare = async (cardIndex: number) => {
    const card = cards[cardIndex];
    const playerName = playerData.account?.gameName || 'Player';
    
    let shareText = '';
    switch (card.id) {
      case 'welcome':
        shareText = `Check out ${playerName}'s League of Legends Wrapped! 🎮`;
        break;
      case 'personality':
        const archetype = playerData.personality?.personality?.archetype?.name || 'Unknown';
        shareText = `${playerName} is a ${archetype} player! 🧠 What's your League personality?`;
        break;
      case 'traits':
        shareText = `${playerName}'s Big Five personality traits revealed! 📊`;
        break;
      case 'gameplay':
        const role = playerData.personality?.stats?.features?.primaryRole || 'Unknown';
        shareText = `${playerName} dominates as a ${role}! ⚔️`;
        break;
      default:
        shareText = `${playerName}'s League of Legends stats are impressive! 🏆`;
    }
    
    setShareCardData({
      title: card.title,
      content: shareText
    });
    setShowShareModal(true);
  };

  const generateCardImage = async (): Promise<string | null> => {
    if (!cardContainerRef.current) return null;
    
    try {
      const canvas = await html2canvas(cardContainerRef.current, {
        backgroundColor: '#1a1a1a',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: false,
        width: 900,
        height: 700,
      } as any);
      
      return canvas.toDataURL('image/png', 0.9);
    } catch (error) {
      console.error('Error generating card image:', error);
      return null;
    }
  };

  const downloadImage = async () => {
    const imageDataUrl = await generateCardImage();
    if (!imageDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `league-wrapped-${shareCardData?.title || 'card'}.png`;
    link.href = imageDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    closeShareModal();
  };

  const shareToSocials = async (platform: string) => {
    const imageDataUrl = await generateCardImage();
    const text = shareCardData?.content || '';
    
    if (navigator.share && imageDataUrl) {
      // Convert data URL to blob for native sharing
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'league-wrapped.png', { type: 'image/png' });
      
      try {
        await navigator.share({
          title: shareCardData?.title,
          text: text,
          files: [file]
        });
        closeShareModal();
        return;
      } catch (error) {
        console.log('Native sharing failed, falling back to platform-specific sharing');
      }
    }
    
    // Fallback to platform-specific sharing
    const encodedText = encodeURIComponent(text);
    let url = '';
    
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedText}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodedText}`;
        break;
      case 'instagram':
        // Instagram doesn't support direct sharing, so copy text and open Instagram
        navigator.clipboard.writeText(text);
        url = 'https://www.instagram.com/';
        break;
      case 'copy':
        navigator.clipboard.writeText(text);
        closeShareModal();
        return;
    }
    
    if (url) {
      window.open(url, '_blank');
    }
    closeShareModal();
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    setShareCardData(null);
  };

  return (
    <div className="hero-section results-wrapped">
      <div className="wrapped-container">
        {/* Main Content Area */}
        <div className="main-content-area">
          {/* Navigation Buttons */}
          <button 
            className="nav-button prev"
            onClick={prevCard}
            disabled={currentCardIndex === 0}
          >
            ‹
          </button>

          {/* Card Container */}
          <div className="card-container" ref={cardContainerRef}>
            {/* Share Button */}
            <button 
              className="share-button"
              onClick={() => handleShare(currentCardIndex)}
              title="Share this card"
            >
              📤
            </button>
            
            <div 
              className="card-slider"
              style={{ transform: `translateX(-${currentCardIndex * 100}%)` }}
            >
              {cards.map((card, index) => (
                <div key={card.id} className="card-slide">
                  {card.component}
                </div>
              ))}
            </div>
          </div>

          <button 
            className="nav-button next"
            onClick={nextCard}
            disabled={currentCardIndex === cards.length - 1}
          >
            ›
          </button>
        </div>

        {/* Progress Bar */}
        <div className="progress-indicators">
          {cards.map((_, index) => (
            <div
              key={index}
              className={`progress-dot ${index === currentCardIndex ? 'active' : ''} ${index < currentCardIndex ? 'completed' : ''}`}
              onClick={() => goToCard(index)}
            />
          ))}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && shareCardData && (
        <div className="share-modal-overlay" onClick={closeShareModal}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Share {shareCardData.title}</h3>
            <div className="share-options">
              <div className="share-option" onClick={() => shareToSocials('instagram')}>
                <div className="share-option-icon">📷</div>
                <div className="share-option-label">Instagram Story</div>
              </div>
              <div className="share-option" onClick={() => shareToSocials('twitter')}>
                <div className="share-option-icon">🐦</div>
                <div className="share-option-label">Twitter</div>
              </div>
              <div className="share-option" onClick={() => shareToSocials('facebook')}>
                <div className="share-option-icon">📘</div>
                <div className="share-option-label">Facebook</div>
              </div>
              <div className="share-option" onClick={() => shareToSocials('copy')}>
                <div className="share-option-icon">📋</div>
                <div className="share-option-label">Copy Text</div>
              </div>
              <div className="share-option" onClick={downloadImage}>
                <div className="share-option-icon">💾</div>
                <div className="share-option-label">Download Image</div>
              </div>
            </div>
            <button className="share-modal-close" onClick={closeShareModal}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPage;
