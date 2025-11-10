// API Configuration
// Automatically detects if running locally or on production

const isProduction = process.env.NODE_ENV === 'production';

// In production (Vercel), use relative URLs (same domain)
// In development, use localhost:5000
export const API_BASE_URL = isProduction ? '' : 'http://localhost:5000';

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

// Export for use in components
const config = {
  API_BASE_URL,
  getApiUrl,
};

export default config;
