import axios from 'axios';

// Default to the production URL from upstream, but allow override via env variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000/api'
    : 'https://cofuncion.com/nyc-house-code-backend/api'
);

const api = axios.create({
  baseURL: API_BASE_URL,
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
