/**
 * HOLLY Desktop App — Preload Script
 * Phase 8.4 — Secure IPC bridge between Electron and renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hollyDesktop', {
  // Platform info
  platform: process.platform,
  isDesktop: true,

  // Window controls
  minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),
  setAlwaysOnTop: (flag) => ipcRenderer.send('set-always-on-top', flag),

  // Notifications
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),

  // Window events
  onFocus: (callback) => ipcRenderer.on('window-focused', callback),
  onBlur: (callback) => ipcRenderer.on('window-blurred', callback),
});
