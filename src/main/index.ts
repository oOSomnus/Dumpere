import { app, BrowserWindow, nativeTheme, screen, shell } from 'electron'
import log from 'electron-log'
import { store } from './store'
import { setupIPCHandlers } from './ipc-handlers'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Configure logging
log.transports.file.level = 'info'
log.transports.console.level = 'debug'

let mainWindow: BrowserWindow | null = null

function showWindowOnceReady() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (!mainWindow.isVisible()) {
    mainWindow.show()
    log.info('Window shown')
  }
}

function getSavedBounds(): { x: number; y: number; width: number; height: number } {
  const saved = store.get('windowBounds')
  if (saved) {
    // Validate against current display config
    const displays = screen.getAllDisplays()
    const onDisplay = displays.some(d => {
      const { x, y, width, height } = d.bounds
      return saved.x >= x && saved.x < x + width && saved.y >= y && saved.y < y + height
    })
    if (onDisplay) return saved
  }
  // Default: primary display, 1200x800, centered
  const primary = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primary.workAreaSize
  return {
    x: Math.round((screenWidth - 1200) / 2),
    y: Math.round((screenHeight - 800) / 2),
    width: 1200,
    height: 800
  }
}

function createWindow() {
  log.info('Creating main window')

  const bounds = getSavedBounds()
  const isMaximized = store.get('windowMaximized', false)

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 800,
    minHeight: 600,
    title: 'Dumpere',
    show: !process.env.VITE_DEV_SERVER_URL,
    webPreferences: {
      preload: resolve(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Restore maximized state
  if (isMaximized) {
    mainWindow.maximize()
  }

  // Track bounds changes
  mainWindow.on('resize', saveBounds)
  mainWindow.on('move', saveBounds)
  mainWindow.on('maximize', () => store.set('windowMaximized', true))
  mainWindow.on('unmaximize', () => store.set('windowMaximized', false))

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    log.info('ready-to-show received')
    showWindowOnceReady()
  })

  // Some Windows builds can miss ready-to-show when the renderer stalls.
  // Fall back to showing the window so startup failures are at least visible.
  setTimeout(() => {
    log.info('Fallback show timer fired')
    showWindowOnceReady()
  }, 3000)

  // Send initial theme
  mainWindow.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors)
  nativeTheme.on('updated', () => {
    mainWindow?.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors)
  })

  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    log.error(`Renderer failed to load: ${errorCode} ${errorDescription} ${validatedURL}`)
    showWindowOnceReady()
  })

  mainWindow.webContents.on('render-process-gone', (_, details) => {
    log.error('Renderer process gone', details)
    showWindowOnceReady()
  })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(resolve(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  log.info('Window created successfully')
}

function saveBounds() {
  if (!mainWindow || mainWindow.isMaximized()) return
  const bounds = mainWindow.getBounds()
  store.set('windowBounds', bounds)
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Focus existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    log.info('App ready, starting Dumpere')
    setupIPCHandlers()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
