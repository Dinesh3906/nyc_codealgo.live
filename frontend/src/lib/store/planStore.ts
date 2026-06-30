import { create } from 'zustand';
import api from '@/lib/api';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

interface PlanState {
  plans: any[];
  searchQuery: string;
  filter: 'all' | 'critical' | 'analyzed';
  loading: boolean;
  socketConnected: boolean;
  setSearchQuery: (query: string) => void;
  setFilter: (filter: 'all' | 'critical' | 'analyzed') => void;
  fetchPlans: () => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  filteredPlans: () => any[];
  initSocket: () => void;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plans: [],
  searchQuery: '',
  filter: 'all',
  loading: false,
  socketConnected: false,
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setFilter: (filter: 'all' | 'critical' | 'analyzed') => set({ filter }),
  fetchPlans: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/plans');
      // Deep-parse analysisResult to handle any serialization format
      const plans = (res.data || []).map((p: any) => {
        let result = p.analysisResult;
        let depth = 0;
        while (typeof result === 'string' && depth < 5) {
          try { result = JSON.parse(result); } catch { break; }
          depth++;
        }
        if (typeof result !== 'object' || result === null) result = {};
        return { ...p, analysisResult: result };
      });
      set({ plans, loading: false });
    } catch (err) {
      console.error(err);
      set({ loading: false });
    }
  },
  deletePlan: async (id: string) => {
    const previousPlans = get().plans;
    // Optimistic Update
    set({ plans: previousPlans.filter((p) => p.id !== id) });

    try {
      await api.delete(`/plans/${id}`);
      toast.success("Plan deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Error deleting plan. Restoring...");
      // Rollback on failure
      set({ plans: previousPlans });
    }
  },
  initSocket: () => {
    if (get().socketConnected) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || (
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:5000'
        : 'https://api-permitiq.codealgo.live'
    );

    const socket = io(socketUrl);

    socket.on('connect', () => {
      set({ socketConnected: true });
      console.log('Socket connected to backend');
    });

    socket.on('analysis-status', (data) => {
      console.log('Analysis Status Update:', data);

      if (data.status === 'COMPLETE') {
        toast.success(`Scan Complete: ${data.report.score}% Compliance`, {
          duration: 5000,
          position: 'top-right'
        });
        get().fetchPlans();
      }

      if (data.status === 'FAILED') {
        toast.error(`Scan Failed for plan: ${data.planId}`);
        get().fetchPlans();
      }
    });

    socket.on('disconnect', () => {
      set({ socketConnected: false });
    });
  },
  filteredPlans: () => {
    const { plans, searchQuery, filter } = get();
    let results = [...plans];

    if (searchQuery) {
      results = results.filter(p => p.fileName.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (filter === 'critical') {
      results = results.filter(p => p.analysisResult?.issues?.some((i: any) => i.severity === 'critical'));
    } else if (filter === 'analyzed') {
      results = results.filter(p => p.status === 'analyzed');
    }

    return results;
  }
}));
