import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  subStatus?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  login: (user: User) => void;
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
      login: (user) => set({ 
        user, 
        isAuthenticated: true 
      }),
      setUser: (user) => set({ 
        user, 
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

        const hasUser = !!state.user?.email;
        if (hasUser !== state.isAuthenticated) {
          state.setUser(hasUser ? state.user : null);
        }

        state.setHasHydrated(true);
      },
    }
  )
);
