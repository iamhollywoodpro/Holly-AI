/**
 * useWindowManager - React hook for window manager
 * Provides reactive state management for modular windows
 */

import { useState, useEffect, useCallback } from 'react';
import { windowManager, WindowState, WindowPosition, WindowSize } from '@/lib/window-manager';

export function useWindowManager() {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to window manager state changes
    const unsubscribe = windowManager.subscribe((state) => {
      setWindows(windowManager.getVisibleWindows());
      setActiveWindowId(state.activeWindowId);
    });

    // Initialize with current state
    setWindows(windowManager.getVisibleWindows());
    setActiveWindowId(windowManager.getState().activeWindowId);

    return unsubscribe;
  }, []);

  const createWindow = useCallback((
    id: string,
    title: string,
    component: string,
    options?: {
      position?: WindowPosition;
      size?: WindowSize;
      isMaximized?: boolean;
    }
  ) => {
    return windowManager.createWindow(id, title, component, options);
  }, []);

  const closeWindow = useCallback((id: string) => {
    windowManager.closeWindow(id);
  }, []);

  const focusWindow = useCallback((id: string) => {
    windowManager.focusWindow(id);
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    windowManager.minimizeWindow(id);
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    windowManager.maximizeWindow(id);
  }, []);

  const restoreWindow = useCallback((id: string) => {
    windowManager.restoreWindow(id);
  }, []);

  const updatePosition = useCallback((id: string, position: WindowPosition) => {
    windowManager.updatePosition(id, position);
  }, []);

  const updateSize = useCallback((id: string, size: WindowSize) => {
    windowManager.updateSize(id, size);
  }, []);

  return {
    windows,
    activeWindowId,
    createWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    updatePosition,
    updateSize,
  };
}
