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
        console.log('[Zustand addRepo] Called with repo:', repo);
        console.log('[Zustand addRepo] Current state:', { activeRepos: state.activeRepos, currentRepoId: state.currentRepoId });
        // Check if repo already exists
        const exists = state.activeRepos.find(r => r.fullName === repo.fullName);
        if (exists) {
          console.log('[Zustand addRepo] Repo exists, updating');
          // Update existing repo and set as current
          const newState = {
            activeRepos: state.activeRepos.map(r => 
              r.fullName === repo.fullName ? repo : r
            ),
            currentRepoId: repo.fullName,
          };
          console.log('[Zustand addRepo] New state after update:', newState);
          return newState;
        }
        
        console.log('[Zustand addRepo] Repo does not exist, adding new');
        // Add new repo and set as current
        const newState = {
          activeRepos: [...state.activeRepos, repo],
          currentRepoId: repo.fullName,
        };
        console.log('[Zustand addRepo] New state after add:', newState);
        return newState;
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
 * Fixed to properly subscribe to Zustand state changes
 */
export function useActiveRepo() {
  // Subscribe to actual state values (not functions)
  const activeRepos = useActiveRepos(state => state.activeRepos);
  const currentRepoId = useActiveRepos(state => state.currentRepoId);
  console.log('[useActiveRepo] activeRepos:', activeRepos, 'currentRepoId:', currentRepoId);
  const addRepo = useActiveRepos(state => state.addRepo);
  const removeRepo = useActiveRepos(state => state.removeRepo);
  const setBranchForRepo = useActiveRepos(state => state.setBranchForRepo);
  
  // Derive activeRepo from subscribed state (reactive)
  const activeRepo = currentRepoId 
    ? activeRepos.find(r => r.fullName === currentRepoId) || null
    : null;
  console.log('[useActiveRepo] Computed activeRepo:', activeRepo);
  
  return {
    activeRepo,
    setActiveRepo: (repo: ActiveRepository | null) => {
      console.log('[useActiveRepo] setActiveRepo called with:', repo);
      if (repo) {
        console.log('[useActiveRepo] Calling addRepo');
        addRepo(repo);
      } else {
        if (activeRepo) {
          removeRepo(activeRepo.fullName);
        }
      }
    },
    setBranch: (branch: string) => {
      if (activeRepo) {
        setBranchForRepo(activeRepo.fullName, branch);
      }
    },
    clearActiveRepo: () => {
      if (activeRepo) {
        removeRepo(activeRepo.fullName);
      }
    },
  };
}
