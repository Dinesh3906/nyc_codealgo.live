import axios from 'axios';

// Default to the production URL from upstream, but allow override via env variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api-permitiq.codealgo.live/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes for AI processing
});

// Attach JWT token from persisted Zustand auth store to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('nyc-house-code-auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        const token = parsed?.state?.user?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (e) {
      // Silently ignore parse errors
    }
  }
  return config;
});

// Auto-logout on 401 responses — purge stale/rotated tokens immediately
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const code = error.response?.data?.code;
      // Only auto-redirect for auth-related 401s, not for login attempts
      const isAuthError = code === 'SECRET_ROTATED' || code === 'TOKEN_EXPIRED' 
        || code === 'TOKEN_VERSION_MISMATCH' || code === 'MISSING_TOKEN'
        || code === 'MALFORMED_TOKEN';
      
      if (isAuthError) {
        // Clear the stale token from localStorage
        localStorage.removeItem('nyc-house-code-auth');
        
        // Prevent redirect loops — only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?session=expired';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
