// API Configuration for Vite
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Helper function to get full API URL
export function getApiUrl(endpoint: string): string {
  // If we're in development and no base URL is set, use relative URLs (proxy will handle)
  if (!API_BASE_URL && import.meta.env.DEV) {
    return endpoint;
  }
  
  // In production or when base URL is set, use full URL
  return `${API_BASE_URL}${endpoint}`;
}

// Export for use in query client if needed
export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};
