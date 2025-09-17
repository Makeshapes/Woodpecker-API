import { app, BrowserWindow, ipcMain, Menu, shell, dialog } from 'electron'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { setupIpcHandlers } from './ipc'
import { setAppDataPath } from '../database/config'
import { initializeDatabase } from '../database/init'
import { logger } from './utils/logger'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load environment variables for the main process (development)
// Ensures process.env.CLAUDE_API_KEY is available to main services
if (process.env.NODE_ENV !== 'production') {
  dotenv.config()
}

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
// Use app.getAppPath() for packaged apps to properly resolve paths within asar
process.env.APP_ROOT = app.getAppPath()

// Debug logging (remove in production)
// console.log('APP_ROOT:', process.env.APP_ROOT);
// console.log('__dirname:', __dirname);
// console.log('app.isPackaged:', app.isPackaged);

// In packaged apps, __dirname points to the dist-electron directory inside the asar
// We need to go up one level to get to the app root
const appRoot = app.isPackaged ? path.dirname(__dirname) : process.env.APP_ROOT

export const MAIN_DIST = path.join(appRoot, 'dist-electron')
export const RENDERER_DIST = path.join(appRoot, 'dist')
// In dev mode, connect to the Vite dev server
export const VITE_DEV_SERVER_URL =
  process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : undefined

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(appRoot, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (process.platform === 'win32') {
  app.disableHardwareAcceleration()
}

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') {
  app.setAppUserModelId(app.getName())
}

// Enable remote debugging for Playwright MCP integration (development only)
if (process.env.NODE_ENV !== 'production') {
  app.commandLine.appendSwitch('remote-debugging-port', '9222')
  logger.info('App', 'Remote debugging enabled on port 9222 for MCP integration')
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, 'preload.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

/**
 * Create application menu
 */
function createApplicationMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Import',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            win?.webContents.send('menu-action', 'new-import')
          },
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit()
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' },
      ],
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
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Woodpecker API',
          click: () => {
            win?.webContents.send('menu-action', 'about')
          },
        },
        {
          label: 'Learn More',
          click: () => {
            shell.openExternal('https://github.com/your-repo/woodpecker-api')
          },
        },
      ],
    },
  ]

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    })

    // Window menu
    template[4].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' },
    ]
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

async function createWindow() {
  logger.info('Window', `Creating window with preload: ${preload}`)
  win = new BrowserWindow({
    title: 'Woodpecker API',
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
  })

  // Handle window ready to show
  win.once('ready-to-show', () => {
    if (win) {
      win.show()

      // Focus window on creation
      if (process.platform === 'darwin') {
        win.focus()
      }
    }
  })

  // Handle window closed
  win.on('closed', () => {
    win = null
  })

  // Prevent window from being closed, minimize to tray instead (optional)
  win.on('close', (event) => {
    if (process.platform === 'darwin') {
      event.preventDefault()
      win?.hide()
    }
  })

  try {
    if (VITE_DEV_SERVER_URL) {
      // Development mode
      await win.loadURL(VITE_DEV_SERVER_URL)
      // Open devtools when in development
      win.webContents.openDevTools()
    } else {
      // Production mode
      // Debug logging (remove in production)
      // logger.info('Window', `Loading from file: ${indexHtml}`);
      // logger.info('Window', `APP_ROOT: ${process.env.APP_ROOT}`);
      // logger.info('Window', `RENDERER_DIST: ${RENDERER_DIST}`);
      await win.loadFile(indexHtml)
    }
  } catch (error) {
    logger.error(
      'Window',
      'Failed to load application content',
      error instanceof Error ? error : new Error(String(error))
    )
    throw error
  }

  // Enhanced window event handlers
  win.webContents.on('did-finish-load', () => {
    logger.info('Window', 'Application content loaded successfully')
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logger.error(
      'Window',
      `Failed to load content: ${errorDescription} (${errorCode})`
    )
  })

  // Enhanced link handling
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Apply electron-updater
  // update(win);
}

app.whenReady().then(async () => {
  try {
    logger.info('App', 'Application starting up')

    // In production, attempt to load environment from userData or resources
    if (process.env.NODE_ENV === 'production') {
      try {
        const prodEnvCandidates = [
          path.join(app.getPath('userData'), '.env'),
          // In packaged apps, resourcesPath points inside the .app bundle
          path.join(process.resourcesPath, '.env'),
        ]
        for (const candidate of prodEnvCandidates) {
          if (fs.existsSync(candidate)) {
            dotenv.config({ path: candidate })
            logger.info('App', `Loaded environment from ${candidate}`)
            break
          }
        }
      } catch (envError) {
        logger.warn('App', 'Failed to load production .env', envError as Error)
      }
    }

    // Get user data path and set it in the config
    const userDataPath = app.getPath('userData')
    setAppDataPath(userDataPath)

    // Initialize database with retry logic
    let dbInitialized = false
    let retryCount = 0
    const maxRetries = 3

    while (!dbInitialized && retryCount < maxRetries) {
      try {
        await initializeDatabase()
        dbInitialized = true
        logger.info('Database', 'Database initialized successfully')
      } catch (dbError) {
        retryCount++
        logger.error(
          'Database',
          `Database initialization attempt ${retryCount} failed`,
          dbError instanceof Error ? dbError : new Error(String(dbError))
        )

        if (retryCount >= maxRetries) {
          throw new Error(
            `Failed to initialize database after ${maxRetries} attempts: ${dbError instanceof Error ? dbError.message : String(dbError)}`
          )
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount))
      }
    }

    // Setup IPC handlers
    setupIpcHandlers(userDataPath)
    logger.info('IPC', 'IPC handlers setup complete')

    // Create application menu
    createApplicationMenu()
    logger.info('App', 'Application menu created')

    // Create main window
    await createWindow()
    logger.info('App', 'Main window created successfully')

    // Set application ready state
    logger.info('App', 'Application startup completed successfully')
  } catch (error) {
    logger.error(
      'App',
      'Failed to initialize application',
      error instanceof Error ? error : new Error(String(error))
    )

    // Show error dialog to user
    dialog.showErrorBox(
      'Application Startup Error',
      `Failed to start Woodpecker API: ${error instanceof Error ? error.message : String(error)}

The application will now exit.`
    )

    app.quit()
  }
})

app.on('window-all-closed', () => {
  logger.info('App', 'All windows closed')
  win = null

  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    logger.info('App', 'Quitting application')
    app.quit()
  }
})

app.on('second-instance', () => {
  logger.info('App', 'Second instance detected, focusing main window')

  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) {
      win.restore()
    }
    if (!win.isVisible()) {
      win.show()
    }
    win.focus()
  }
})

app.on('activate', () => {
  logger.info('App', 'Application activated')

  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    // Recreate window if none exists (macOS behavior)
    createWindow().catch((error) => {
      logger.error(
        'App',
        'Failed to recreate window on activate',
        error instanceof Error ? error : new Error(String(error))
      )
    })
  }
})

app.on('before-quit', (event) => {
  logger.info('App', 'Application preparing to quit')

  // Perform cleanup operations here if needed
  // For now, just log the event
})

app.on('will-quit', (event) => {
  logger.info('App', 'Application will quit')

  // Final cleanup operations
  // Close database connections, save state, etc.
})

// Enhanced Security: Prevent navigation to external websites
app.on('web-contents-created', (_, contents) => {
  logger.debug(
    'Security',
    'New web contents created, applying security policies'
  )

  // Prevent navigation to external websites
  contents.on('will-navigate', (navigationEvent, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)

    // Allow navigation to dev server or local files only
    const isAllowed =
      parsedUrl.origin === VITE_DEV_SERVER_URL ||
      navigationUrl.startsWith('file://') ||
      navigationUrl.startsWith('data:')

    if (!isAllowed) {
      logger.warn('Security', `Blocked navigation to: ${navigationUrl}`)
      navigationEvent.preventDefault()
    }
  })

  // Enhanced new window handling
  contents.setWindowOpenHandler(({ url }) => {
    logger.debug('Security', `Window open request for: ${url}`)

    // Allow opening external links in default browser
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url)
      logger.info('Security', `Opened external URL in browser: ${url}`)
    } else {
      logger.warn('Security', `Blocked window open request for: ${url}`)
    }
    return { action: 'deny' }
  })

  // Security: Prevent permission requests
  contents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      logger.warn('Security', `Permission request denied: ${permission}`)
      callback(false)
    }
  )

  // Security: Block insecure content
  contents.on(
    'certificate-error',
    (event, url, error, certificate, callback) => {
      logger.error('Security', `Certificate error for ${url}: ${error}`)
      event.preventDefault()
      callback(false)
    }
  )
})

// Enhanced graceful shutdown handling
let isShuttingDown = false

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    logger.warn('App', `Received ${signal} during shutdown, forcing exit`)
    process.exit(1)
  }

  isShuttingDown = true
  logger.info('App', `Received ${signal}, initiating graceful shutdown`)

  try {
    // Close all windows
    const allWindows = BrowserWindow.getAllWindows()
    allWindows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.close()
      }
    })

    // Give some time for cleanup
    await new Promise((resolve) => setTimeout(resolve, 1000))

    logger.info('App', 'Graceful shutdown completed')
    app.quit()
  } catch (error) {
    logger.error(
      'App',
      'Error during graceful shutdown',
      error instanceof Error ? error : new Error(String(error))
    )
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('App', 'Uncaught exception', error)
  gracefulShutdown('uncaughtException')
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error(
    'App',
    'Unhandled promise rejection',
    reason instanceof Error ? reason : new Error(String(reason))
  )
  gracefulShutdown('unhandledRejection')
})
