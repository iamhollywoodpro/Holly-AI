/**
 * HOLLY Desktop App — Electron Main Process
 * Phase 8.4 — Desktop application wrapper
 *
 * Features:
 * - System tray integration
 * - Global hotkey (Cmd+Shift+H) for quick access
 * - Native notifications
 * - Always-on-top mode
 * - Auto-update via electron-updater
 */

const { app, BrowserWindow, Tray, Menu, globalShortcut, Notification, ipcMain } = require('electron');
const path = require('path');

const HOLLY_URL = process.env.HOLLY_URL || 'https://holly.nexamusicgroup.com';
const isDev = process.env.NODE_ENV === 'development';

let mainWindow = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'HOLLY AI',
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load Holly web app
  mainWindow.loadURL(HOLLY_URL);

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Focus/blur for presence
  mainWindow.on('focus', () => {
    mainWindow.webContents.send('window-focused');
  });

  mainWindow.on('blur', () => {
    mainWindow.webContents.send('window-blurred');
  });
}

function createTray() {
  // Use a simple icon (in production, use a proper .ico/.icns)
  tray = new Tray(path.join(__dirname, 'assets', 'tray-icon.png'));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open HOLLY', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { type: 'separator' },
    { label: 'Always on Top', type: 'checkbox', click: (item) => {
      mainWindow.setAlwaysOnTop(item.checked);
    }},
    { type: 'separator' },
    { label: 'Quit HOLLY', click: () => { app.isQuitting = true; app.quit(); } },
  ]);

  tray.setToolTip('HOLLY AI');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

function registerGlobalShortcut() {
  // Cmd+Shift+H (Mac) or Ctrl+Shift+H (Windows/Linux) to toggle window
  const ret = globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  if (!ret) {
    console.error('Global shortcut registration failed');
  }
}

function showNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body, icon: path.join(__dirname, 'assets', 'tray-icon.png') }).show();
  }
}

// IPC handlers
ipcMain.on('show-notification', (event, { title, body }) => {
  showNotification(title, body);
});

ipcMain.on('set-always-on-top', (event, flag) => {
  mainWindow.setAlwaysOnTop(flag);
});

ipcMain.on('minimize-to-tray', () => {
  mainWindow.hide();
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();
  registerGlobalShortcut();

  // Auto-update check (production only)
  if (!isDev) {
    try {
      const { autoUpdater } = require('electron-updater');
      autoUpdater.checkForUpdatesAndNotify();
    } catch {
      // electron-updater not available
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
