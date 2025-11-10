# Shape Split - League of Legends Digital Twin Platform

Shape Split creates digital twins of League of Legends summoners for coaching, interaction, gameplay improvement, and comprehensive personality insights. The platform analyzes gameplay patterns to generate psychological profiles, enabling players to better understand their playstyle, find compatible duo partners, and interact with an AI-powered version of themselves.

## Overview

Shape Split transforms League of Legends match data into actionable personality insights by combining psychometric analysis with artificial intelligence. The platform fetches player statistics from the Riot Games API, processes gameplay patterns through a custom personality analysis engine, and generates an interactive digital twin powered by AWS Bedrock's Claude AI model.

## Architecture

### Project Structure

```
ShapeSplitter/
├── client/                      # React TypeScript frontend
│   ├── src/
│   │   ├── App.tsx             # Main application component
│   │   ├── SearchPage.tsx      # Player search interface
│   │   ├── LoadingPage.tsx     # Real-time data fetching progress
│   │   ├── ResultsPage.tsx     # Personality analysis dashboard
│   │   └── PlayerDataContext.tsx # Global state management
│   └── build/                   # Production build output
│
├── api/                         # Vercel serverless functions
│   ├── search.js               # Player data retrieval endpoint
│   ├── chat.js                 # Digital twin chat interface
│   ├── matchmaking.js          # Duo compatibility analysis
│   ├── regions.js              # Regional routing configuration
│   └── _lib/                   # Shared utilities
│       ├── leagueDataFetcher.js    # Riot API client
│       ├── personalityAnalyzer.js  # Personality calculation engine
│       ├── prompts.js              # AI system prompts
│       └── utils.js                # Helper functions
│
└── server/                     # Express server (local development only)
```

### Technology Stack

**Frontend**
- React with TypeScript for type-safe component development
- React Router for client-side navigation
- Context API for global state management
- CSS3 for responsive UI design

**Backend**
- Node.js serverless functions hosted on Vercel
- Riot Games API for player statistics and match history
- AWS Bedrock (Claude 3.5 Sonnet) for conversational AI
- Data Dragon CDN for champion and profile icon assets

**Data Processing**
- Custom psychometric analysis engine
- Statistical variance and aggregation calculations
- Big Five personality trait mapping
- Jungian archetype classification

## Core Features

### 1. Player Search and Data Retrieval

The search endpoint (`/api/search`) fetches comprehensive player data through the Riot Games API:

**Data Collection Process:**
1. Account lookup via Riot ID (gameName + tagLine)
2. Summoner profile retrieval (level, profile icon)
3. Ranked statistics (tier, rank, LP, win rate)
4. Champion mastery scores (top 10 champions with mastery points)
5. Match history collection (up to 100 recent matches)
6. Match detail analysis (targeting 25 valid ranked/normal games)

**Smart Match Filtering:**
- Valid queue types: Ranked Solo/Duo (420), Ranked Flex (440), Normal Draft (400), Normal Blind (430), Normal Quickplay (490)
- Early termination when target valid games are reached
- Rate limiting (1200ms delay) to comply with Riot API restrictions
- Parallel asset loading for champion images and icons

### 2. Personality Analysis Engine

The personality analyzer (`personalityAnalyzer.js`) implements a sophisticated psychometric model that maps gameplay patterns to personality traits.

#### Statistical Feature Extraction

From match data, the engine calculates:

**Combat Metrics:**
- Average KDA (Kills/Deaths/Assists ratio)
- KDA variance (consistency indicator)
- Death variance (emotional stability indicator)
- Kill participation rate (teamfight involvement)
- First blood rate (early game aggression)
- Aggression index: `(kills + killParticipation) / (deaths + assists)`

**Strategic Metrics:**
- Vision score per minute (map awareness)
- Objective focus (dragons, barons, turrets per game)
- Champion diversity (unique champions / total games)
- Assist ratio (assists / kills)
- Primary role consistency

#### Big Five Personality Trait Mapping

The engine maps gameplay features to five personality dimensions (0-100 scale):

**1. Openness to Experience (Creativity & Variety)**
- Champion diversity: +40 points per diversity ratio
- Mid lane players: +15 points (creative roaming opportunities)
- ADC/Support players: -10 points (structured playstyle)

**2. Conscientiousness (Discipline & Consistency)**
- Deaths above 3: -2 points per excess death
- KDA variance: -2.5 points per unit
- Death variance: -2 points per unit
- High KDA bonus: +5 points per KDA unit (capped at +20)
- ADC role: +15 points (precision farming required)

**3. Extraversion (Aggression & Engagement)**
- Kill participation: +0.4 points per percentage
- Aggression index: +20 points per unit
- First blood rate: +25 points per occurrence
- Jungle/Mid roles: +15 points (active map presence)
- Top lane: -15 points (isolated gameplay)

**4. Agreeableness (Teamwork & Support)**
- Assist ratio: +15 points per unit (capped at +25)
- Vision per minute: +7 points per unit (capped at +15)
- Low assists penalty: -30 points when ratio < 0.5
- Support role: +25 points
- Jungle role: +10 points
- Mid lane: -10 points
- Top lane: -5 points

**5. Emotional Stability (Consistency & Composure)**
- KDA variance: -3 points per unit
- Death variance: -2.5 points per unit
- Objective focus: +8 points per objective
- KDA consistency bonus: +10 points (KDA > 2.0 with variance < 2.0)
- Jungle role: +10 points (macro control)

All traits are normalized to 0-100 range after calculation.

#### Jungian Archetype Matching

The system maps players to 12 Jungian archetypes using Euclidean distance in 5-dimensional trait space:

- **Innocent**: High Agreeableness (80), Conscientiousness (70) - Support champions like Lulu, Soraka
- **Orphan**: Balanced across all traits (50-75) - Team players like Amumu, Maokai
- **Hero**: High Extraversion (90), Conscientiousness (75) - Frontline warriors like Garen, Darius
- **Caregiver**: Maximum Agreeableness (95) - Selfless supports like Janna, Nami
- **Explorer**: High Openness (85), Extraversion (80) - Adventurous picks like Taliyah, Bard
- **Rebel**: Maximum Extraversion (95), low Agreeableness (45) - Aggressive soloists like Yasuo, Draven
- **Lover**: High Extraversion (85), Agreeableness (90) - Duo synergy champions like Xayah, Rakan
- **Creator**: Maximum Openness (90), high Conscientiousness (70) - Strategic innovators like Viktor, Heimerdinger
- **Jester**: High Extraversion (90), low Conscientiousness (45) - Chaotic tricksters like Teemo, Shaco
- **Sage**: Balanced high traits (60-75) - Disciplined masters like Ryze, Orianna
- **Magician**: High Openness (75), Extraversion (75), Conscientiousness (75) - Versatile playmakers like Twisted Fate, Zed
- **Ruler**: High Conscientiousness (80), Emotional Stability (75) - Macro controllers like Galio, Shen

Similarity score: `max(0, 100 - (euclideanDistance / 173 * 100))`

### 3. AWS Bedrock Integration

The chat endpoint (`/api/chat`) creates an interactive digital twin using AWS Bedrock's Claude 3.5 Sonnet model.

#### System Architecture

**Authentication:**
- Bearer token authentication via `BEDROCK_API_KEY` environment variable
- Regional endpoint routing: `https://bedrock-runtime.{AWS_REGION}.amazonaws.com/model/{modelId}/invoke`

**Model Configuration:**
- Model: `anthropic.claude-3-5-sonnet-20240620-v1:0`
- Max tokens: 300 (concise responses)
- Temperature: 0.7 (balanced creativity and consistency)
- Anthropic version: `bedrock-2023-05-31`

#### Digital Twin Context Building

The system constructs a rich context from player data:

```javascript
Player: {gameName}#{tagLine}
Level: {summonerLevel}
Rank: {tier} {rank} {leaguePoints}LP ({winRate}% WR, {wins}W/{losses}L)
Top Champions: {champion1} ({masteryPoints}k pts), {champion2}, {champion3}
Archetype: {archetypeName} ({similarity}% match)
Personality Traits: Openness: {score}%, Conscientiousness: {score}%, ...
Primary Role: {role}
Average KDA: {kda}
Aggression Level: {aggressionIndex}%
Recent Performance: {wins}W/{losses}L in last {totalGames} games
```

#### Conversation Management

- System prompt establishes the AI as the player's digital twin
- Maintains last 10 messages of conversation history
- Context injection before each user message
- Fallback responses when API fails

### 4. Duo Compatibility Analysis

The matchmaking endpoint (`/api/matchmaking`) analyzes compatibility between two players using AI-powered assessment.

**Process Flow:**
1. Fetch complete data for both players (if not already available)
2. Generate personality profiles for both
3. Construct comparative context with:
   - Big Five trait differences
   - Archetype compatibility
   - Role synergy potential
   - Playstyle complementarity
4. Send to Claude for natural language compatibility analysis

**AI Compatibility Output:**
```json
{
  "score": 0-100,
  "level": "Excellent|Very Good|Good|Fair|Challenging",
  "recommendation": "2-3 sentence personalized advice",
  "strengths": ["synergy1", "synergy2", "synergy3"],
  "challenges": ["challenge1", "challenge2"]
}
```

## Deployment

### Vercel Deployment (Recommended)

Shape Split is optimized for Vercel's serverless platform:

1. **Push to GitHub:**
   ```bash
   git push origin main
   ```

2. **Import to Vercel:**
   - Connect your GitHub repository
   - Vercel auto-detects the configuration

3. **Configure Environment Variables:**
   ```
   RIOT_API_KEY=your_riot_api_key
   BEDROCK_API_KEY=your_aws_bedrock_key  # Optional for chat features
   AWS_REGION=us-east-1                   # Optional, default: us-east-1
   ```

4. **Deploy:**
   - Automatic deployment on every push
   - Serverless functions in `/api` are automatically detected
   - Client built from `/client` directory

### Local Development

**Prerequisites:**
- Node.js v14 or higher
- npm package manager
- Riot Games API key (https://developer.riotgames.com/)

**Setup:**

1. Clone and install dependencies:
   ```bash
   git clone <repository-url>
   cd ShapeSplitter
   npm run install-all
   ```

2. Create `.env` file:
   ```bash
   RIOT_API_KEY=your_riot_api_key_here
   BEDROCK_API_KEY=your_bedrock_api_key  # Optional
   AWS_REGION=us-east-1                  # Optional
   ```

3. Run with Vercel CLI (recommended):
   ```bash
   npm install -g vercel
   vercel dev
   ```

   Or run with Express server:
   ```bash
   npm run dev
   ```

## API Endpoints

### GET/POST `/api/search`
Fetch and analyze player data.

**Parameters:**
- `gameName`: Riot ID game name
- `tagLine`: Riot ID tag (e.g., "NA1")
- `region`: Server region (default: "na1")

**Response:** Complete player profile with personality analysis

### POST `/api/chat`
Interact with player's digital twin.

**Body:**
```json
{
  "message": "User message",
  "playerData": { /* player context */ },
  "chatHistory": [ /* previous messages */ ]
}
```

**Response:** AI-generated response as digital twin

### POST `/api/matchmaking`
Analyze duo compatibility.

**Body:**
```json
{
  "player1Data": { /* first player data */ },
  "player2GameName": "string",
  "player2TagLine": "string",
  "region": "na1"
}
```

**Response:** Compatibility score and analysis

### GET `/api/regions`
List available regions and routing configurations.

## Performance Optimizations

- Rate limiting (1200ms) for Riot API compliance
- Early termination when target valid games reached
- Parallel asset loading for champion images
- Smart batch processing for match history
- Conversation history limited to last 10 messages
- Cached Data Dragon version and champion data

## Development Scripts

```bash
npm run dev              # Start both client and server
npm run server           # Express server only (port 5000)
npm run client           # React development server (port 3000)
npm run build            # Production build
npm run vercel-build     # Vercel deployment build
npm run install-all      # Install all dependencies
```

## Supported Regions

**Americas:** na1, br1, la1, la2  
**Asia:** kr, jp1  
**Europe:** euw1, eun1, tr1, ru  
**Southeast Asia:** oc1, ph2, sg2, th2, tw2, vn2

## License

MIT
