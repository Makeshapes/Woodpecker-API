import { app, BrowserWindow, ipcMain, Menu, shell, dialog } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { logger } from './utils/logger';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '../..');

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

// Disable GPU Acceleration for Windows 7
if (process.platform === 'win32') {
  app.disableHardwareAcceleration();
}

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') {
  app.setAppUserModelId(app.getName());
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let win: BrowserWindow | null = null;
const preload = path.join(__dirname, '../preload/preload.mjs');
const indexHtml = path.join(RENDERER_DIST, 'index.html');

/**
 * Create application menu
 */
function createApplicationMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Test Frontend',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            win?.webContents.send('menu-action', 'test-frontend');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function createWindow() {
  win = new BrowserWindow({
    title: 'Woodpecker API - Frontend Test',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    center: true,
    show: false, // Don't show until ready
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      sandbox: false, // Required for IPC bridge
      spellcheck: false,
    },
  });

  // Handle window ready to show
  win.once('ready-to-show', () => {
    if (win) {
      win.show();
      
      // Focus window on creation
      if (process.platform === 'darwin') {
        win.focus();
      }
    }
  });

  // Handle window closed
  win.on('closed', () => {
    win = null;
  });

  try {
    if (VITE_DEV_SERVER_URL) {
      // Development mode
      await win.loadURL(VITE_DEV_SERVER_URL);
      // Open devtools when in development
      win.webContents.openDevTools();
    } else {
      // Production mode
      await win.loadFile(indexHtml);
    }
  } catch (error) {
    logger.error('Window', 'Failed to load application content', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  // Enhanced window event handlers
  win.webContents.on('did-finish-load', () => {
    logger.info('Window', 'Application content loaded successfully');
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logger.error('Window', `Failed to load content: ${errorDescription} (${errorCode})`);
  });

  // Enhanced link handling
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  try {
    logger.info('App', 'Frontend test application starting up');
    
    // Create application menu
    createApplicationMenu();
    logger.info('App', 'Application menu created');
    
    // Create main window
    await createWindow();
    logger.info('App', 'Main window created successfully');
    
    // Set application ready state
    logger.info('App', 'Frontend test application startup completed successfully');
    
  } catch (error) {
    logger.error('App', 'Failed to initialize application', error instanceof Error ? error : new Error(String(error)));
    
    // Show error dialog to user
    dialog.showErrorBox(
      'Application Startup Error',
      `Failed to start Woodpecker API Frontend Test: ${error instanceof Error ? error.message : String(error)}\n\nThe application will now exit.`
    );
    
    app.quit();
  }
});

app.on('window-all-closed', () => {
  logger.info('App', 'All windows closed');
  win = null;
  
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    logger.info('App', 'Quitting application');
    app.quit();
  }
});

app.on('second-instance', () => {
  logger.info('App', 'Second instance detected, focusing main window');
  
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) {
      win.restore();
    }
    if (!win.isVisible()) {
      win.show();
    }
    win.focus();
  }
});

app.on('activate', () => {
  logger.info('App', 'Application activated');
  
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    // Recreate window if none exists (macOS behavior)
    createWindow().catch(error => {
      logger.error('App', 'Failed to recreate window on activate', error instanceof Error ? error : new Error(String(error)));
    });
  }
});

// Enhanced graceful shutdown handling
let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    logger.warn('App', `Received ${signal} during shutdown, forcing exit`);
    process.exit(1);
  }
  
  isShuttingDown = true;
  logger.info('App', `Received ${signal}, initiating graceful shutdown`);
  
  try {
    // Close all windows
    const allWindows = BrowserWindow.getAllWindows();
    allWindows.forEach(window => {
      if (!window.isDestroyed()) {
        window.close();
      }
    });
    
    // Give some time for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    logger.info('App', 'Graceful shutdown completed');
    app.quit();
  } catch (error) {
    logger.error('App', 'Error during graceful shutdown', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
