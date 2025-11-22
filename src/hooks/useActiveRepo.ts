import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ActiveRepository {
  owner: string;
  repo: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  language?: string;
  description?: string;
  url: string;
}

interface ActiveRepoState {
  activeRepo: ActiveRepository | null;
  setActiveRepo: (repo: ActiveRepository | null) => void;
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
      clearActiveRepo: () => set({ activeRepo: null }),
    }),
    {
      name: 'holly-active-repo',
    }
  )
);
