import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';

// Matchmaking Card Component
interface MatchmakingCardProps {
  playerData: PlayerData | null;
}

interface MatchmakingResult {
  success: boolean;
  player1: {
    gameName: string;
    tagLine: string;
    profileIconUrl?: string;
    personality: any;
  };
  player2: {
    gameName: string;
    tagLine: string;
    profileIconUrl?: string;
    personality: any;
    ranked?: any[];
    championMastery?: any;
  };
  compatibility: {
    score: number;
    level: string;
    strengths: string[];
    challenges: string[];
    recommendation: string;
  };
}

const MatchmakingCard: React.FC<MatchmakingCardProps> = ({ playerData }) => {
  const [searchInput, setSearchInput] = useState('');
  const [region, setRegion] = useState('na1');
  const [isSearching, setIsSearching] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchmakingResult | null>(null);
  const [error, setError] = useState<string>('');

  // Region options (same as SearchPage)
  const regions = [
    { value: 'na1', label: 'North America' },
    { value: 'euw1', label: 'Europe West' },
    { value: 'eun1', label: 'Europe Nordic & East' },
    { value: 'kr', label: 'Korea' },
    { value: 'jp1', label: 'Japan' },
    { value: 'br1', label: 'Brazil' },
    { value: 'la1', label: 'Latin America North' },
    { value: 'la2', label: 'Latin America South' },
    { value: 'oc1', label: 'Oceania' },
    { value: 'tr1', label: 'Turkey' },
    { value: 'ru', label: 'Russia' }
  ];

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    
    const [gameName, tagLine] = searchInput.split('#');
    if (!gameName || !tagLine) {
      setError('Please enter a valid Riot ID (e.g. PlayerName#TAG)');
      return;
    }

    setIsSearching(true);
    setError('');
    setMatchResult(null);

    try {
      const response = await fetch('http://localhost:5000/api/matchmaking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player1Data: playerData,
          player2GameName: gameName.trim(),
          player2TagLine: tagLine.trim(),
          region: region
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate compatibility');
      }

      setMatchResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsSearching(false);
    }
  };

  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return '#4ade80'; // green
    if (score >= 65) return '#3b82f6'; // blue  
    if (score >= 50) return '#f59e0b'; // yellow
    if (score >= 35) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const reset = () => {
    setMatchResult(null);
    setSearchInput('');
    setError('');
    setRegion('na1');
  };

  if (matchResult) {
    return (
      <div className="wrapped-card matchmaking-card">
        <div className="wrapped-card-content">
          <div className="matchmaking-header">
            <h3 className="card-title">Matchmake</h3>
            <button onClick={reset} className="reset-button">Try Another</button>
          </div>

          <div className="compatibility-result">
            <div className="players-comparison">
              <div className="player-info">
                {matchResult.player1.profileIconUrl && (
                  <img src={matchResult.player1.profileIconUrl} alt="Player 1" className="player-avatar" />
                )}
                <div className="player-details">
                  <div className="player-name">{matchResult.player1.gameName}</div>
                  <div className="player-tag">#{matchResult.player1.tagLine}</div>
                  <div className="player-archetype">
                    {matchResult.player1.personality?.personality?.archetype?.name || 'Unknown'}
                  </div>
                </div>
              </div>

              <div className="compatibility-score-container">
                <div 
                  className="compatibility-score"
                  style={{ color: getCompatibilityColor(matchResult.compatibility.score) }}
                >
                  {matchResult.compatibility.score}%
                </div>
                <div className="compatibility-level">{matchResult.compatibility.level}</div>
                <div className="compatibility-hearts">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span 
                      key={i} 
                      className={`heart ${i < Math.ceil(matchResult.compatibility.score / 20) ? 'filled' : ''}`}
                    >
                      🤍
                    </span>
                  ))}
                </div>
              </div>

              <div className="player-info">
                {matchResult.player2.profileIconUrl && (
                  <img src={matchResult.player2.profileIconUrl} alt="Player 2" className="player-avatar" />
                )}
                <div className="player-details">
                  <div className="player-name">{matchResult.player2.gameName}</div>
                  <div className="player-tag">#{matchResult.player2.tagLine}</div>
                  <div className="player-archetype">
                    {matchResult.player2.personality?.personality?.archetype?.name || 'Unknown'}
                  </div>
                </div>
              </div>
            </div>

            <div className="compatibility-details">
              <div className="recommendation">
                <h4>🎯 Recommendation</h4>
                <p>{matchResult.compatibility.recommendation}</p>
              </div>

              {matchResult.compatibility.strengths.length > 0 && (
                <div className="strengths">
                  <h4>💪 Strengths</h4>
                  <ul>
                    {matchResult.compatibility.strengths.map((strength, i) => (
                      <li key={i}>{strength}</li>
                    ))}
                  </ul>
                </div>
              )}

              {matchResult.compatibility.challenges.length > 0 && (
                <div className="challenges">
                  <h4>⚠️ Things to Watch</h4>
                  <ul>
                    {matchResult.compatibility.challenges.map((challenge, i) => (
                      <li key={i}>{challenge}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrapped-card matchmaking-card">
      <div className="wrapped-card-content">
        <h3 className="card-title">Matchmake</h3>
        <div className="matchmaking-search">
          <p className="search-description">
            Check your compatibility with another summoner!
          </p>
          
          <div className="matchmaking-search-form">
            
            <div className="matchmaking-input-group">
              <input
                type="text"
                value={searchInput.split('#')[0] || ''}
                onChange={(e) => {
                  const tagPart = searchInput.split('#')[1] || '';
                  setSearchInput(`${e.target.value}${tagPart ? '#' + tagPart : ''}`);
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Game Name"
                className="matchmaking-search-input"
                disabled={isSearching}
              />
              <span className="matchmaking-separator">#</span>
              <input
                type="text"
                value={searchInput.split('#')[1] || ''}
                onChange={(e) => {
                  const gamePart = searchInput.split('#')[0] || '';
                  setSearchInput(`${gamePart}#${e.target.value}`);
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Tag"
                className="matchmaking-search-input matchmaking-tag-input"
                disabled={isSearching}
              />
            </div>
            <div className="matchmaking-region-selector">
              <label htmlFor="matchmaking-region">Region:</label>
              <select
                id="matchmaking-region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="matchmaking-region-select"
                disabled={isSearching}
              >
                {regions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchInput.trim() || !searchInput.includes('#')}
              className="matchmaking-search-button"
            >
              {isSearching ? 'Searching...' : 'Find Match'}
            </button>
          </div>

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          {isSearching && (
            <div className="loading-message">
              <div className="loading-spinner"></div>
              <p>Analyzing compatibility... This may take a moment!</p>
            </div>
          )}

    
        </div>
      </div>
    </div>
  );
};

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
  
  // Only include Summoner's Rift games (ranked and normal)
  const allowedModes = ['CLASSIC'];
  
  const gameModeMap: { [key: string]: string } = {
    'CLASSIC': "Summoner's Rift"
  };
  
  const statsByMode: { [key: string]: { kills: number[], deaths: number[], assists: number[], wins: number, total: number } } = {};
  
  matches.forEach((match) => {
    const gameMode = match.info?.gameMode || 'Unknown';
    
    // Only process matches from allowed game modes
    if (!allowedModes.includes(gameMode)) {
      return;
    }
    
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
    
    // Add matchmaking card count (always present)
    count += 1;
    
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
            <h3 className="card-title">🎭 {playerData.account?.gameName}'s Archetype</h3>
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
            <h3 className="card-title">🧠 {playerData.account?.gameName}'s Big Five</h3>
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
            <h3 className="card-title">🎮 {playerData.account?.gameName}'s Playstyle</h3>
            <div className="gameplay-display">
              {playerData.personality.stats?.features && (
                <div className="gameplay-stats">
                  <div className="primary-role">
                    <span className="role-label">You're a </span>
                    <span className="role-name">{playerData.personality.stats.features.primaryRole?.replace('UTILITY', 'Support').replace('BOTTOM', 'ADC')}</span>
                    <span className="role-label"> main</span>
                  </div>
                  <div className="gameplay-insights">
                    <div className="insight">
                      <span className="insight-value">{(playerData.personality.stats.features.championDiversity * 100).toFixed(0)}%</span>
                      <span className="insight-label"> Champion Diversity</span>
                    </div>
                    <div className="insight">
                      <span className="insight-value">{playerData.personality.stats.features.aggressionIndex.toFixed(1)}</span>
                      <span className="insight-label"> Aggression Index</span>
                    </div>
                    <div className="insight">
                      <span className="insight-value">{playerData.personality.stats.features.avgKda.toFixed(2)}</span>
                      <span className="insight-label"> Average KDA</span>
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
                  <span className="big-label"> Games Played</span>
                </div>
                <div className="kda-display">
                  <div className="kda-numbers">
                    <span className="kda-value">{stats.avgKills}</span>
                    <span className="kda-value">/</span>
                    <span className="kda-value">{stats.avgDeaths}</span>
                    <span className="kda-value">/</span>
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

  // Add matchmaking card
  cards.push({
    id: 'matchmaking',
    title: 'Matchmaking',
    component: <MatchmakingCard playerData={playerData} />
  });

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
      // Find the currently visible card slide
      const cardSlides = cardContainerRef.current.querySelectorAll('.card-slide');
      const currentSlide = cardSlides[currentCardIndex] as HTMLElement;
      
      if (!currentSlide) return null;

      // Create a temporary container for capturing
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.top = '-9999px';
      tempContainer.style.left = '-9999px';
      tempContainer.style.width = '800px';
      tempContainer.style.height = 'auto';
      tempContainer.style.background = '#1a1a1a';
      tempContainer.style.padding = '20px';
      tempContainer.style.zIndex = '99999';
      
      // Clone the current slide
      const clonedSlide = currentSlide.cloneNode(true) as HTMLElement;
      
      // Apply styles to make the clone render properly
      clonedSlide.style.position = 'static';
      clonedSlide.style.transform = 'none';
      clonedSlide.style.width = '100%';
      clonedSlide.style.height = 'auto';
      clonedSlide.style.display = 'flex';
      
      // Find and fix the wrapped card in the clone
      const clonedCard = clonedSlide.querySelector('.wrapped-card') as HTMLElement;
      if (clonedCard) {
        clonedCard.style.width = '100%';
        clonedCard.style.height = 'auto';
        clonedCard.style.minHeight = '600px';
        clonedCard.style.maxHeight = 'none';
        clonedCard.style.overflow = 'visible';
        clonedCard.style.display = 'flex';
        clonedCard.style.flexDirection = 'column';
      }
      
      // Special handling for chat messages in digital twin card
      const clonedChatMessages = clonedSlide.querySelector('.chat-messages') as HTMLElement;
      if (clonedChatMessages) {
        clonedChatMessages.style.height = 'auto';
        clonedChatMessages.style.maxHeight = 'none';
        clonedChatMessages.style.overflow = 'visible';
        clonedChatMessages.style.display = 'flex';
        clonedChatMessages.style.flexDirection = 'column';
      }
      
      // Add the clone to temp container and container to document
      tempContainer.appendChild(clonedSlide);
      document.body.appendChild(tempContainer);
      
      // Wait for the DOM to update and styles to apply
      await new Promise(resolve => setTimeout(resolve, 300));

      // Capture the temp container
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: '#1a1a1a',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: false,
        width: 840, // 800 + 40 padding
        height: tempContainer.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        ignoreElements: (element: HTMLElement) => {
          // Ignore any elements that might cause issues
          return element.classList?.contains('share-button') || false;
        }
      } as any);

      // Remove the temporary container
      document.body.removeChild(tempContainer);

      // Create a standardized canvas with 1:1 aspect ratio (square for social media)
      const standardCanvas = document.createElement('canvas');
      const standardSize = 1080; // Instagram/Twitter optimal size
      standardCanvas.width = standardSize;
      standardCanvas.height = standardSize;
      
      const ctx = standardCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Fill background with gradient
      const gradient = ctx.createRadialGradient(
        standardSize / 2, standardSize / 2, 0,
        standardSize / 2, standardSize / 2, standardSize / 2
      );
      gradient.addColorStop(0, '#1a1a1a');
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, standardSize, standardSize);

      // Calculate scaling to fit the card in the square canvas
      const cardAspectRatio = canvas.width / canvas.height;
      let drawWidth, drawHeight, drawX, drawY;

      if (cardAspectRatio > 1) {
        // Card is wider than tall
        drawWidth = standardSize * 0.85; // 85% of canvas width
        drawHeight = drawWidth / cardAspectRatio;
      } else {
        // Card is taller than wide
        drawHeight = standardSize * 0.85; // 85% of canvas height
        drawWidth = drawHeight * cardAspectRatio;
      }

      // Center the card in the canvas
      drawX = (standardSize - drawWidth) / 2;
      drawY = (standardSize - drawHeight) / 2;

      // Draw the card on the standard canvas
      ctx.drawImage(canvas, drawX, drawY, drawWidth, drawHeight);

      // Add subtle border/frame
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 3;
      ctx.strokeRect(drawX - 1.5, drawY - 1.5, drawWidth + 3, drawHeight + 3);

      // Add branding watermark in bottom right
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '32px Rajdhani, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Shape Split', standardSize - 30, standardSize - 30);

      return standardCanvas.toDataURL('image/png', 0.95);
    } catch (error) {
      console.error('Error generating card image:', error);
      
      // Clean up any leftover temp containers
      const tempContainers = document.querySelectorAll('div[style*="position: fixed"][style*="-9999px"]');
      tempContainers.forEach(container => {
        try {
          document.body.removeChild(container);
        } catch (e) {
          // Ignore errors when removing
        }
      });
      
      return null;
    }
  };

  const downloadImage = async () => {
    // Add loading state
    const downloadOption = document.querySelector('.share-option:nth-child(5)');
    if (downloadOption) {
      downloadOption.classList.add('loading');
    }
    
    try {
      const imageDataUrl = await generateCardImage();
      if (!imageDataUrl) {
        throw new Error('Failed to generate image');
      }
      
      const playerName = playerData.account?.gameName || 'Player';
      const cardTitle = shareCardData?.title?.toLowerCase().replace(/\s+/g, '-') || 'card';
      const fileName = `${playerName}-league-wrapped-${cardTitle}.png`;
      
      const link = document.createElement('a');
      link.download = fileName;
      link.href = imageDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Show success feedback
      if (downloadOption) {
        const originalLabel = downloadOption.querySelector('.share-option-label')?.textContent;
        const labelElement = downloadOption.querySelector('.share-option-label');
        if (labelElement) {
          labelElement.textContent = 'Downloaded! ✓';
          setTimeout(() => {
            labelElement.textContent = originalLabel || 'Download Image';
          }, 2000);
        }
      }
      
      setTimeout(closeShareModal, 1500);
    } catch (error) {
      console.error('Download failed:', error);
      
      // Show error feedback
      if (downloadOption) {
        const originalLabel = downloadOption.querySelector('.share-option-label')?.textContent;
        const labelElement = downloadOption.querySelector('.share-option-label');
        if (labelElement) {
          labelElement.textContent = 'Failed ✗';
          setTimeout(() => {
            labelElement.textContent = originalLabel || 'Download Image';
          }, 2000);
        }
      }
    } finally {
      // Remove loading state
      if (downloadOption) {
        downloadOption.classList.remove('loading');
      }
    }
  };

  const shareToSocials = async (platform: string) => {
    const imageDataUrl = await generateCardImage();
    const text = shareCardData?.content || '';
    const currentUrl = window.location.href;
    
    // Add loading state to the clicked option
    const shareOptions = document.querySelectorAll('.share-option');
    shareOptions.forEach((option, index) => {
      if ((platform === 'instagram' && index === 0) ||
          (platform === 'twitter' && index === 1) ||
          (platform === 'facebook' && index === 2) ||
          (platform === 'copy' && index === 3)) {
        option.classList.add('loading');
      }
    });

    if (!imageDataUrl) {
      console.error('Failed to generate image for sharing');
      // Remove loading state and show error
      shareOptions.forEach(option => option.classList.remove('loading'));
      return;
    }
    
    // Try native sharing with image first on mobile devices
    if (navigator.share && platform !== 'copy') {
      try {
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        const playerName = playerData.account?.gameName || 'Player';
        const fileName = `${playerName}-league-wrapped.png`;
        const file = new File([blob], fileName, { type: 'image/png' });
        
        await navigator.share({
          title: shareCardData?.title || 'League of Legends Wrapped',
          text: text,
          files: [file]
        });
        closeShareModal();
        return;
      } catch (error) {
        console.log('Native sharing failed, using platform-specific sharing');
      }
    }
    
    // For platforms that don't support direct image sharing, we'll handle differently
    const encodedText = encodeURIComponent(text);
    const hashtags = encodeURIComponent('LeagueOfLegends LoLWrapped Gaming');
    let url = '';
    
    switch (platform) {
      case 'twitter':
        // Twitter doesn't support direct image upload via URL, but we can encourage users to add the image
        try {
          // Copy the image to clipboard for easy pasting
          const response = await fetch(imageDataUrl);
          const blob = await response.blob();
          
          if (navigator.clipboard && window.ClipboardItem) {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            
            // Update the label to show image is copied
            const option = document.querySelector('.share-option:nth-child(2)');
            if (option) {
              const labelElement = option.querySelector('.share-option-label');
              if (labelElement) {
                const originalLabel = labelElement.textContent;
                labelElement.textContent = 'Image copied! Paste it';
                setTimeout(() => {
                  labelElement.textContent = originalLabel;
                }, 3000);
              }
            }
          }
        } catch (error) {
          console.log('Could not copy image to clipboard');
        }
        
        url = `https://twitter.com/intent/tweet?text=${encodedText}&hashtags=${hashtags}`;
        break;
        
      case 'facebook':
        // Facebook also doesn't support direct image upload, copy image and open Facebook
        try {
          const response = await fetch(imageDataUrl);
          const blob = await response.blob();
          
          if (navigator.clipboard && window.ClipboardItem) {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            
            const option = document.querySelector('.share-option:nth-child(3)');
            if (option) {
              const labelElement = option.querySelector('.share-option-label');
              if (labelElement) {
                const originalLabel = labelElement.textContent;
                labelElement.textContent = 'Image copied! Paste it';
                setTimeout(() => {
                  labelElement.textContent = originalLabel;
                }, 3000);
              }
            }
          }
        } catch (error) {
          console.log('Could not copy image to clipboard');
        }
        
        url = `https://www.facebook.com/`;
        break;
        
      case 'instagram':
        // For Instagram, copy both the image and text
        try {
          const response = await fetch(imageDataUrl);
          const blob = await response.blob();
          const instagramText = `${text}\n\n#LeagueOfLegends #LoLWrapped #Gaming`;
          
          // Try to copy image to clipboard
          if (navigator.clipboard && window.ClipboardItem) {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
          }
          
          // Also copy text as fallback
          await navigator.clipboard.writeText(instagramText);
          
          const option = document.querySelector('.share-option:nth-child(1)');
          if (option) {
            const labelElement = option.querySelector('.share-option-label');
            if (labelElement) {
              const originalLabel = labelElement.textContent;
              labelElement.textContent = 'Image & text copied!';
              setTimeout(() => {
                labelElement.textContent = originalLabel;
              }, 3000);
            }
          }
        } catch (error) {
          console.error('Failed to copy content');
        }
        url = 'https://www.instagram.com/';
        break;
        
      case 'copy':
        // Copy both image and text for maximum flexibility
        try {
          const response = await fetch(imageDataUrl);
          const blob = await response.blob();
          const copyText = `${text}\n\nCheck it out: ${currentUrl}`;
          
          // Try to copy both image and text
          if (navigator.clipboard && window.ClipboardItem) {
            // Try to copy image first
            try {
              const item = new ClipboardItem({ 'image/png': blob });
              await navigator.clipboard.write([item]);
              
              const option = document.querySelector('.share-option:nth-child(4)');
              if (option) {
                const labelElement = option.querySelector('.share-option-label');
                if (labelElement) {
                  labelElement.textContent = 'Image copied! ✓';
                  setTimeout(() => {
                    labelElement.textContent = 'Copy Text';
                  }, 2000);
                }
              }
            } catch (imageError) {
              // Fallback to text if image copy fails
              await navigator.clipboard.writeText(copyText);
              
              const option = document.querySelector('.share-option:nth-child(4)');
              if (option) {
                const labelElement = option.querySelector('.share-option-label');
                if (labelElement) {
                  labelElement.textContent = 'Text copied! ✓';
                  setTimeout(() => {
                    labelElement.textContent = 'Copy Text';
                  }, 2000);
                }
              }
            }
          } else {
            // Fallback to text only
            await navigator.clipboard.writeText(copyText);
          }
          
          setTimeout(closeShareModal, 1500);
          return;
        } catch (error) {
          console.error('Failed to copy content');
        }
        break;
    }
    
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    
    // Remove loading state
    setTimeout(() => {
      shareOptions.forEach(option => option.classList.remove('loading'));
      closeShareModal();
    }, 1000);
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
            <p className="share-subtitle">Share your League Wrapped card as an image</p>
            <div className="share-options">
              <div className="share-option" onClick={() => shareToSocials('instagram')}>
                <div className="share-option-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <div className="share-option-label">Instagram</div>
              </div>
              <div className="share-option" onClick={() => shareToSocials('twitter')}>
                <div className="share-option-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <div className="share-option-label">Twitter</div>
              </div>
              <div className="share-option" onClick={() => shareToSocials('facebook')}>
                <div className="share-option-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <div className="share-option-label">Facebook</div>
              </div>
              <div className="share-option" onClick={() => shareToSocials('copy')}>
                <div className="share-option-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </div>
                <div className="share-option-label">Copy Image</div>
              </div>
              <div className="share-option" onClick={downloadImage}>
                <div className="share-option-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </div>
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
