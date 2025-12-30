/**
 * WindowContainer - Container for all modular windows
 * Renders all windows and manages their lifecycle
 */

'use client';

import { useWindowManager } from '@/hooks/useWindowManager';
import ModularWindow from './ModularWindow';
import dynamic from 'next/dynamic';

// Window content components registry
const windowComponents: Record<string, React.ComponentType<any>> = {
  sandbox: dynamic(() => import('./sandbox-window')),
  settings: dynamic(() => import('./SettingsWindow')),
  terminal: dynamic(() => import('./TerminalWindow')),
  fileExplorer: dynamic(() => import('./FileExplorerWindow')),
  // Add more window types as needed
};

export default function WindowContainer() {
  const {
    windows,
    activeWindowId,
    closeWindow,
    focusWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    updatePosition,
    updateSize,
  } = useWindowManager();

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {windows.map((window) => {
        const WindowContent = windowComponents[window.component];
        
        if (!WindowContent) {
          console.warn(`Window component "${window.component}" not found`);
          return null;
        }

        return (
          <div key={window.id} className="pointer-events-auto">
            <ModularWindow
              window={window}
              isActive={window.id === activeWindowId}
              onFocus={() => focusWindow(window.id)}
              onClose={() => closeWindow(window.id)}
              onMinimize={() => minimizeWindow(window.id)}
              onMaximize={() => maximizeWindow(window.id)}
              onRestore={() => restoreWindow(window.id)}
              onPositionChange={(x, y) => updatePosition(window.id, { x, y })}
              onSizeChange={(width, height) => updateSize(window.id, { width, height })}
            >
              <WindowContent windowId={window.id} />
            </ModularWindow>
          </div>
        );
      })}
    </div>
  );
}
