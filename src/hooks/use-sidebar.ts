/**
 * Sidebar State Management
 * Zustand store for sidebar state with persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarStore {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  expandedSections: string[];
  activeDropdown: string | null;
  
  // Actions
  toggleCollapse: () => void;
  toggleMobile: () => void;
  toggleSection: (sectionId: string) => void;
  setActiveDropdown: (dropdownId: string | null) => void;
  closeAll: () => void;
}

export const useSidebar = create<SidebarStore>()(
  persist(
    (set) => ({
      isCollapsed: false,
      isMobileOpen: false,
      expandedSections: ['library'], // Library expanded by default
      activeDropdown: null,
      
      toggleCollapse: () =>
        set((state) => ({ isCollapsed: !state.isCollapsed })),
      
      toggleMobile: () =>
        set((state) => ({ isMobileOpen: !state.isMobileOpen })),
      
      toggleSection: (sectionId) =>
        set((state) => ({
          expandedSections: state.expandedSections.includes(sectionId)
            ? state.expandedSections.filter((id) => id !== sectionId)
            : [...state.expandedSections, sectionId],
        })),
      
      setActiveDropdown: (dropdownId) =>
        set({ activeDropdown: dropdownId }),
      
      closeAll: () =>
        set({
          isMobileOpen: false,
          activeDropdown: null,
        }),
    }),
    {
      name: 'holly-sidebar',
      partialize: (state) => ({
        isCollapsed: state.isCollapsed,
        expandedSections: state.expandedSections,
      }),
    }
  )
);
