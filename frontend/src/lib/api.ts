import axios from 'axios';

// Dynamically determine the API base URL based on the current window hostname
const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    if (window.location.hostname.includes('codealgo.live')) {
      return 'https://api-permitiq.codealgo.live/api';
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'https://api-permitiq.codealgo.live/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 300000, // 5 minutes for AI processing
  withCredentials: true, // Crucial for sending and receiving HttpOnly auth cookies
});

// Request interceptor to attach dynamic baseURL and CSRF token from cookie
api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(new RegExp('(^| )csrf_token=([^;]*)'));
      if (match && match[2]) {
        config.headers['X-CSRF-Token'] = decodeURIComponent(match[2]);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auto-logout on 401 responses — purge stale/rotated tokens immediately
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const code = error.response?.data?.code;
      // Only auto-redirect for auth-related 401s, not for login attempts
      const isAuthError = code === 'SECRET_ROTATED' || code === 'TOKEN_EXPIRED' 
        || code === 'TOKEN_VERSION_MISMATCH' || code === 'MISSING_TOKEN'
        || code === 'MALFORMED_TOKEN' || code === 'INVALID_REFRESH_TOKEN';
      
      if (isAuthError) {
        // Clear the stale authentication state
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
