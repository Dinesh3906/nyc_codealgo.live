import { create } from 'zustand';

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
  (set) => ({
    user: null,
    isAuthenticated: false,
    hasHydrated: true,
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
  })
);
