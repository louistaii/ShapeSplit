// API Configuration for AWS Amplify deployment
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Get the API URL from environment variables
const getApiUrl = () => {
  if (isProduction) {
    // In production, use the environment variable set by Amplify
    const apiUrl = process.env.REACT_APP_API_URL;
    if (!apiUrl) {
      console.error('REACT_APP_API_URL environment variable is not set in production');
      // TODO: Replace this with your actual API Gateway URL
      // Get this from AWS API Gateway console after deploying your backend
      return 'https://your-actual-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod';
    }
    return apiUrl;
  }
  return 'http://localhost:5000';
};

// For production, Amplify will inject the API Gateway URL
// For development, we use localhost
export const API_CONFIG = {
  // The API Gateway endpoint will be available as an environment variable in production
  baseURL: getApiUrl(),
  
  // For Server-Sent Events endpoint
  sseBaseURL: getApiUrl(),

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
