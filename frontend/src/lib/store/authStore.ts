import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  token?: string;
  role?: string;
  subStatus?: string;
}

interface AuthState {
  user: (User & { token: string }) | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  login: (user: User, token: string) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      login: (user, token) => set({ 
        user: { ...user, token }, 
        isAuthenticated: true 
      }),
      setUser: (user) => set({ 
        user: user as any, 
        isAuthenticated: !!user 
      }),
      logout: () => set({ 
        user: null, 
        isAuthenticated: false 
      }),
    }),
    {
      name: 'nyc-house-code-auth',
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        const hasUserToken = !!state.user?.token;
        if (hasUserToken !== state.isAuthenticated) {
          state.setUser(hasUserToken ? state.user : null);
        }

        state.setHasHydrated(true);
      },
    }
  )
);
