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
  
  // Chat functionality state
  const [chatMessages, setChatMessages] = useState<Array<{id: string, text: string, isUser: boolean, timestamp: Date}>>([
    {
      id: '1',
      text: `Hello! I'm ${playerData?.account?.gameName || 'Player'}'s digital twin. Ask me anything about their League of Legends gameplay!`,
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  
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

  // Scroll to bottom when new messages are added
  React.useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);
  
  if (!playerData) return null;
  
  const puuid = playerData.account?.puuid || '';
  const statsByMode = getStatsByGameMode(playerData.matches, puuid);
  const latestPlayers = getLatestUniquePlayers(playerData.matches, puuid);

  // Chat functionality functions
  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;
    
    const userMessage = {
      id: Date.now().toString(),
      text: currentMessage,
      isUser: true,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsTyping(true);
    
    // Simulate AI response with game data context
    setTimeout(() => {
      const aiResponse = generateAIResponse(currentMessage, playerData);
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
  };

  const generateAIResponse = (userMessage: string, data: PlayerData | null): string => {
    const message = userMessage.toLowerCase();
    const gameName = data?.account?.gameName || 'Player';
    
    // Basic responses based on message content
    if (message.includes('rank') || message.includes('tier')) {
      const soloRank = data?.ranked?.find(r => r.queueType === 'RANKED_SOLO_5x5');
      if (soloRank) {
        return `${gameName} is currently ${soloRank.tier} ${soloRank.rank} with ${soloRank.leaguePoints} LP. They have a ${Math.round((soloRank.wins / (soloRank.wins + soloRank.losses)) * 100)}% win rate this season!`;
      }
      return `${gameName} doesn't have a current solo queue ranking, but they're still climbing!`;
    }
    
    if (message.includes('champion') || message.includes('main')) {
      const topChampion = data?.championMastery?.champions?.[0];
      if (topChampion) {
        return `${gameName}'s highest mastery champion is ${topChampion.championName || `Champion ${topChampion.championId}`} with ${topChampion.championPoints?.toLocaleString()} mastery points!`;
      }
      return `${gameName} plays a variety of champions. Versatility is key!`;
    }
    
    if (message.includes('games') || message.includes('matches')) {
      const matchCount = data?.matches?.length || 0;
      return `I've analyzed ${matchCount} recent games from ${gameName}'s match history. They've been quite active lately!`;
    }
    
    if (message.includes('personality') || message.includes('playstyle')) {
      const archetype = data?.personality?.personality?.archetype?.name;
      if (archetype) {
        return `Based on ${gameName}'s gameplay patterns, they exhibit traits of a ${archetype} player. This shows in their decision-making and champion preferences.`;
      }
      return `${gameName} has a unique playstyle that's hard to categorize - that's what makes them special!`;
    }
    
    if (message.includes('level')) {
      const level = data?.summoner?.summonerLevel;
      if (level) {
        return `${gameName} is currently level ${level}. That's a lot of experience on the Rift!`;
      }
      return `${gameName} has been playing League for quite some time!`;
    }
    
    // Default responses
    const responses = [
      `That's an interesting question about ${gameName}! Their gameplay shows consistent improvement over time.`,
      `From what I can see in ${gameName}'s data, they have some impressive patterns in their play.`,
      `${gameName} would probably say that every game is a learning opportunity!`,
      `Looking at ${gameName}'s match history, I can tell they're passionate about improving their gameplay.`,
      `That's a great question! ${gameName}'s League journey has been quite unique.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Create cards array
  const cards: Card[] = [
    {
      id: 'digital-twin',
      title: 'Digital Twin',
      component: (
        <div className="wrapped-card digital-twin-card">
          <div className="wrapped-card-content">
            <div className="digital-twin-header">
              {playerData.summoner?.profileIconUrl && (
                <img src={playerData.summoner.profileIconUrl} alt="Profile Icon" className="twin-profile-icon" />
              )}
              <div className="twin-info">
                <h1 className="twin-title">{playerData.account?.gameName}'s Digital Twin</h1>
                <div className="twin-status">
                  <div className="status-indicator"></div>
                  <span>Online</span>
                </div>
              </div>
            </div>
            
            <div className="chat-container">
              <div className="chat-messages" ref={chatMessagesRef}>
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${message.isUser ? 'user-message' : 'ai-message'}`}
                  >
                    {!message.isUser && (
                      <div className="message-avatar">
                        <img src={playerData.summoner?.profileIconUrl} alt="AI Avatar" />
                      </div>
                    )}
                    <div className="message-content">
                      <p>{message.text}</p>
                      <span className="message-time">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {message.isUser && (
                      <div className="message-avatar user-avatar">
                        👤
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="message ai-message typing-message">
                    <div className="message-avatar">
                      <img src={playerData.summoner?.profileIconUrl} alt="AI Avatar" />
                    </div>
                    <div className="message-content">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="chat-input-container">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about your gameplay..."
                  className="chat-input"
                  disabled={isTyping}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isTyping || !currentMessage.trim()}
                  className="send-button"
                >
                  ➤
                </button>
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 16.08C17.24 16.08 16.56 16.38 16.04 16.85L8.91 12.7C8.96 12.47 9 12.24 9 12C9 11.76 8.96 11.53 8.91 11.3L15.96 7.19C16.5 7.69 17.21 8 18 8C19.66 8 21 6.66 21 5C21 3.34 19.66 2 18 2C16.34 2 15 3.34 15 5C15 5.24 15.04 5.47 15.09 5.7L8.04 9.81C7.5 9.31 6.79 9 6 9C4.34 9 3 10.34 3 12C3 13.66 4.34 15 6 15C6.79 15 7.5 14.69 8.04 14.19L15.16 18.34C15.11 18.55 15.08 18.77 15.08 19C15.08 20.61 16.39 21.92 18 21.92C19.61 21.92 20.92 20.61 20.92 19C20.92 17.39 19.61 16.08 18 16.08Z" fill="currentColor"/>
              </svg>
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
