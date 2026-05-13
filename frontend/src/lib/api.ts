import axios from 'axios';

// Default to the production URL from upstream, but allow override via env variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.codealgo.live/api';

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

export default api;
