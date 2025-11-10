# ShapeSplitter - League of Legends Personality Analyzer

A League of Legends player statistics and personality analysis web application. Analyze players' personalities based on their gameplay patterns, find compatible duo partners, and chat with an AI-powered digital twin.

## 🚀 Deploy to Vercel (Recommended)

This project is optimized for Vercel serverless deployment!

**Quick Deploy:**
1. Push to GitHub
2. Import to Vercel
3. Add `RIOT_API_KEY` environment variable
4. Deploy! 🎉

**📖 Complete Guide:** See [READY_TO_DEPLOY.md](READY_TO_DEPLOY.md) for detailed instructions.

**📋 Step-by-Step:** See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

## Project Structure

- `client/` - React frontend application (TypeScript)
- `api/` - Serverless API functions (deployed to Vercel)
  - `_lib/` - Shared modules for API functions
- `server/` - Express server (for local development only, not deployed)

## ✨ Features

- 🔍 **Player Search** - Search any League player by Riot ID
- 🧠 **Personality Analysis** - Analyze gameplay patterns using Big Five personality traits
- 🎭 **Archetype Matching** - Match players to 12 Jungian archetypes
- 💘 **Duo Compatibility** - Find perfect duo queue partners
- 🤖 **AI Chat** - Chat with your digital twin (powered by AWS Bedrock/Claude)
- 📊 **Champion Mastery** - View top champions and play patterns

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm
- Riot Games API key from https://developer.riotgames.com/

### Installation

Install dependencies for all parts of the application:

```bash
npm run install-all
```

### Environment Variables

Create a `.env` file in the root directory (see `.env.example`):

```bash
RIOT_API_KEY=your_riot_api_key_here

# Optional - for AI features
BEDROCK_API_KEY=your_bedrock_api_key
AWS_REGION=us-east-1
```

### Development

**Option 1: With Vercel CLI (Recommended)**
```bash
npm install -g vercel
vercel dev
```

**Option 2: With Express Server**
```bash
npm run dev
```

This will start:
- Server on port 5000
- Client on port 3000 (React development server)

### Building

Build the client for production:

```bash
npm run build
```

## Available Scripts

- `npm run dev` - Start both client and server in development mode
- `npm run server` - Start only the Express server
- `npm run client` - Start only the React client
- `npm run build` - Build client for production
- `npm run vercel-build` - Build for Vercel deployment
- `npm run install-all` - Install dependencies for all packages
- `npm run build` - Build client for production
- `npm run install-all` - Install dependencies for root, server, and client

## Technologies Used

- **Frontend**: React, TypeScript
- **Backend**: Node.js
- **API**: Riot Games API for League of Legends data

## License

MIT
