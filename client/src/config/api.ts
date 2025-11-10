// API Configuration for AWS Amplify deployment
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// For production, Amplify will inject the API Gateway URL
// For development, we use localhost
export const API_CONFIG = {
  // The API Gateway endpoint will be available as an environment variable in production
  baseURL: isProduction 
    ? process.env.REACT_APP_API_URL || '' 
    : 'http://localhost:5000',
  
  // For Server-Sent Events endpoint
  sseBaseURL: isProduction 
    ? process.env.REACT_APP_API_URL || '' 
    : 'http://localhost:5000',

  // Timeout settings
  timeout: 300000, // 5 minutes for long-running analysis
  
  // Headers
  headers: {
    'Content-Type': 'application/json',
  }
};

// API endpoints
export const API_ENDPOINTS = {
  health: '/api/health',
  testImages: '/api/test-images',
  search: (gameName: string, tagLine: string, region: string = 'na1') => 
    `/api/search/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?region=${region}`,
  searchProgress: (gameName: string, tagLine: string, region: string = 'na1') => 
    `/api/search/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}/progress?region=${region}`,
  regions: '/api/regions',
  matchmaking: '/api/matchmaking'
};

export default API_CONFIG;
