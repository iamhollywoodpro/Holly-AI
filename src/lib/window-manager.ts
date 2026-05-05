/**
 * Window Manager - Manages modular draggable/resizable windows
 * Provides state management and utilities for window system
 */

export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface WindowState {
  id: string;
  title: string;
  component: string;
  position: WindowPosition;
  size: WindowSize;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  isVisible: boolean;
}

export interface WindowManagerState {
  windows: Map<string, WindowState>;
  activeWindowId: string | null;
  nextZIndex: number;
}

export class WindowManager {
  private state: WindowManagerState;
  private listeners: Set<(state: WindowManagerState) => void>;

  constructor() {
    this.state = {
      windows: new Map(),
      activeWindowId: null,
      nextZIndex: 1000,
    };
    this.listeners = new Set();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: WindowManagerState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state changes
   */
  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  /**
   * Get current state
   */
  getState(): WindowManagerState {
    return {
      ...this.state,
      windows: new Map(this.state.windows),
    };
  }

  /**
   * Create a new window
   */
  createWindow(
    id: string,
    title: string,
    component: string,
    options?: Partial<Omit<WindowState, 'id' | 'title' | 'component'>>
  ): WindowState {
    const defaultPosition: WindowPosition = {
      x: 100 + (this.state.windows.size * 30),
      y: 100 + (this.state.windows.size * 30),
    };

    const defaultSize: WindowSize = {
      width: 800,
      height: 600,
    };

    const window: WindowState = {
      id,
      title,
      component,
      position: options?.position || defaultPosition,
      size: options?.size || defaultSize,
      isMinimized: options?.isMinimized || false,
      isMaximized: options?.isMaximized || false,
      zIndex: this.state.nextZIndex++,
      isVisible: options?.isVisible !== undefined ? options.isVisible : true,
    };

    this.state.windows.set(id, window);
    this.state.activeWindowId = id;
    this.notify();

    return window;
  }

  /**
   * Close a window
   */
  closeWindow(id: string): void {
    this.state.windows.delete(id);
    
    if (this.state.activeWindowId === id) {
      // Set next available window as active
      const windows = Array.from(this.state.windows.values());
      const visibleWindows = windows.filter(w => w.isVisible && !w.isMinimized);
      this.state.activeWindowId = visibleWindows.length > 0 
        ? visibleWindows[visibleWindows.length - 1].id 
        : null;
    }

    this.notify();
  }

  /**
   * Focus a window (bring to front)
   */
  focusWindow(id: string): void {
    const window = this.state.windows.get(id);
    if (!window) return;

    window.zIndex = this.state.nextZIndex++;
    this.state.activeWindowId = id;
    this.notify();
  }

  /**
   * Update window position
   */
  updatePosition(id: string, position: WindowPosition): void {
    const window = this.state.windows.get(id);
    if (!window) return;

    window.position = position;
    this.notify();
  }

  /**
   * Update window size
   */
  updateSize(id: string, size: WindowSize): void {
    const window = this.state.windows.get(id);
    if (!window) return;

    window.size = {
      width: Math.max(300, size.width),
      height: Math.max(200, size.height),
    };
    this.notify();
  }

  /**
   * Minimize window
   */
  minimizeWindow(id: string): void {
    const window = this.state.windows.get(id);
    if (!window) return;

    window.isMinimized = true;
    window.isMaximized = false;
    this.notify();
  }

  /**
   * Maximize window
   */
  maximizeWindow(id: string): void {
    const window = this.state.windows.get(id);
    if (!window) return;

    window.isMaximized = true;
    window.isMinimized = false;
    this.notify();
  }

  /**
   * Restore window to normal size
   */
  restoreWindow(id: string): void {
    const window = this.state.windows.get(id);
    if (!window) return;

    window.isMaximized = false;
    window.isMinimized = false;
    this.notify();
  }

  /**
   * Toggle window visibility
   */
  toggleVisibility(id: string): void {
    const window = this.state.windows.get(id);
    if (!window) return;

    window.isVisible = !window.isVisible;
    this.notify();
  }

  /**
   * Get window by ID
   */
  getWindow(id: string): WindowState | undefined {
    return this.state.windows.get(id);
  }

  /**
   * Get all windows
   */
  getAllWindows(): WindowState[] {
    return Array.from(this.state.windows.values());
  }

  /**
   * Get visible windows sorted by z-index
   */
  getVisibleWindows(): WindowState[] {
    return Array.from(this.state.windows.values())
      .filter(w => w.isVisible)
      .sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * Clear all windows
   */
  clearAll(): void {
    this.state.windows.clear();
    this.state.activeWindowId = null;
    this.notify();
  }
}

// Singleton instance
export const windowManager = new WindowManager();
