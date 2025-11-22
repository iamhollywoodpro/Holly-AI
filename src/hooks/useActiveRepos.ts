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
  private?: boolean; // Is the repository private
}

interface ActiveReposState {
  // Multi-repo support
  activeRepos: ActiveRepository[]; // All active repositories
  currentRepoId: string | null; // Currently focused repo (fullName)
  
  // Actions
  addRepo: (repo: ActiveRepository) => void;
  removeRepo: (fullName: string) => void;
  setCurrentRepo: (fullName: string) => void;
  setBranchForRepo: (fullName: string, branch: string) => void;
  clearAllRepos: () => void;
  
  // Computed getters
  getCurrentRepo: () => ActiveRepository | null;
  hasMultipleRepos: () => boolean;
}

/**
 * Global state for managing multiple active repositories
 * Supports working on multiple repos simultaneously (microservices, monorepos)
 * Persists to localStorage so context survives page refreshes
 */
export const useActiveRepos = create<ActiveReposState>()(
  persist(
    (set, get) => ({
      activeRepos: [],
      currentRepoId: null,

      addRepo: (repo) => set((state) => {
        // Check if repo already exists
        const exists = state.activeRepos.find(r => r.fullName === repo.fullName);
        if (exists) {
          // Update existing repo and set as current
          return {
            activeRepos: state.activeRepos.map(r => 
              r.fullName === repo.fullName ? repo : r
            ),
            currentRepoId: repo.fullName,
          };
        }
        
        // Add new repo and set as current
        return {
          activeRepos: [...state.activeRepos, repo],
          currentRepoId: repo.fullName,
        };
      }),

      removeRepo: (fullName) => set((state) => {
        const newRepos = state.activeRepos.filter(r => r.fullName !== fullName);
        const newCurrentId = state.currentRepoId === fullName
          ? (newRepos.length > 0 ? newRepos[0].fullName : null)
          : state.currentRepoId;
        
        return {
          activeRepos: newRepos,
          currentRepoId: newCurrentId,
        };
      }),

      setCurrentRepo: (fullName) => set({ currentRepoId: fullName }),

      setBranchForRepo: (fullName, branch) => set((state) => ({
        activeRepos: state.activeRepos.map(repo =>
          repo.fullName === fullName
            ? { ...repo, branch }
            : repo
        ),
      })),

      clearAllRepos: () => set({ activeRepos: [], currentRepoId: null }),

      // Computed getters
      getCurrentRepo: () => {
        const state = get();
        if (!state.currentRepoId) return null;
        return state.activeRepos.find(r => r.fullName === state.currentRepoId) || null;
      },

      hasMultipleRepos: () => {
        return get().activeRepos.length > 1;
      },
    }),
    {
      name: 'holly-active-repos-multi',
    }
  )
);

/**
 * Backward compatibility hook
 * Provides the same API as useActiveRepo but uses multi-repo store
 */
export function useActiveRepo() {
  const store = useActiveRepos();
  
  return {
    activeRepo: store.getCurrentRepo(),
    setActiveRepo: (repo: ActiveRepository | null) => {
      if (repo) {
        store.addRepo(repo);
      } else {
        const current = store.getCurrentRepo();
        if (current) {
          store.removeRepo(current.fullName);
        }
      }
    },
    setBranch: (branch: string) => {
      const current = store.getCurrentRepo();
      if (current) {
        store.setBranchForRepo(current.fullName, branch);
      }
    },
    clearActiveRepo: () => {
      const current = store.getCurrentRepo();
      if (current) {
        store.removeRepo(current.fullName);
      }
    },
  };
}
