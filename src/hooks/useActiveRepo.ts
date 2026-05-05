import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ActiveRepository {
  owner: string;
  repo: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  branch: string; // Currently selected branch
  language?: string;
  description?: string;
  url: string;
}

interface ActiveRepoState {
  activeRepo: ActiveRepository | null;
  setActiveRepo: (repo: ActiveRepository | null) => void;
  setBranch: (branch: string) => void;
  clearActiveRepo: () => void;
}

/**
 * Global state for the currently active repository in chat
 * Persists to localStorage so context survives page refreshes
 */
export const useActiveRepo = create<ActiveRepoState>()(
  persist(
    (set) => ({
      activeRepo: null,
      setActiveRepo: (repo) => set({ activeRepo: repo }),
      setBranch: (branch) => set((state) => {
        if (!state.activeRepo) return state;
        return {
          activeRepo: {
            ...state.activeRepo,
            branch,
          },
        };
      }),
      clearActiveRepo: () => set({ activeRepo: null }),
    }),
    {
      name: 'holly-active-repo',
    }
  )
);
