# League Stats App

A League of Legends player statistics web application built with React and Node.js.

## Project Structure

- `client/` - React frontend application
- `server/` - Node.js backend API server
- Root level contains configuration for running both client and server together

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

Install dependencies for all parts of the application:

```bash
npm run install-all
```

### Development

Start both client and server in development mode:

```bash
npm run dev
```

This will start:
- Server on the default port (check server/index.js)
- Client on port 3000 (React development server)

### Building

Build the client for production:

```bash
npm run build
```

## Available Scripts

- `npm run dev` - Start both client and server in development mode
- `npm run server` - Start only the server
- `npm run client` - Start only the client
- `npm run build` - Build client for production
- `npm run install-all` - Install dependencies for root, server, and client

## Technologies Used

- **Frontend**: React, TypeScript
- **Backend**: Node.js
- **API**: Riot Games API for League of Legends data

## License

MIT
