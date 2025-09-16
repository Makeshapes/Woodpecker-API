import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { app, BrowserWindow } from 'electron';

// Mock Electron modules
vi.mock('electron', () => ({
  app: {
    whenReady: vi.fn(),
    on: vi.fn(),
    quit: vi.fn(),
    requestSingleInstanceLock: vi.fn(() => true),
    setAppUserModelId: vi.fn(),
    disableHardwareAcceleration: vi.fn(),
  },
  BrowserWindow: vi.fn(() => ({
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    show: vi.fn(),
    focus: vi.fn(),
    close: vi.fn(),
    isDestroyed: vi.fn(() => false),
    isMinimized: vi.fn(() => false),
    isVisible: vi.fn(() => true),
    restore: vi.fn(),
    webContents: {
      openDevTools: vi.fn(),
      send: vi.fn(),
      on: vi.fn(),
      setWindowOpenHandler: vi.fn(),
    },
    on: vi.fn(),
    once: vi.fn(),
  })),
  Menu: {
    buildFromTemplate: vi.fn(),
    setApplicationMenu: vi.fn(),
  },
  shell: {
    openExternal: vi.fn(),
  },
  dialog: {
    showErrorBox: vi.fn(),
  },
}));

// Mock path and other Node.js modules
vi.mock('node:path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/')),
    dirname: vi.fn(() => '/mock/dirname'),
  },
}));

vi.mock('node:url', () => ({
  fileURLToPath: vi.fn(() => '/mock/file/path'),
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Main Process', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.VITE_DEV_SERVER_URL;
    process.platform = 'darwin';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Application Initialization', () => {
    it('should request single instance lock', async () => {
      // Import main after mocks are set up
      await import('../main');
      
      expect(app.requestSingleInstanceLock).toHaveBeenCalled();
    });

    it('should disable hardware acceleration on Windows', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true,
      });

      await import('../main');
      
      expect(app.disableHardwareAcceleration).toHaveBeenCalled();
    });

    it('should set app user model ID on Windows', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true,
      });

      await import('../main');
      
      expect(app.setAppUserModelId).toHaveBeenCalled();
    });
  });

  describe('Window Creation', () => {
    it('should create a BrowserWindow with correct configuration', async () => {
      process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173';
      
      await import('../main');
      
      // Simulate app ready
      const whenReadyCallback = (app.whenReady as any).mock.calls[0][0];
      await whenReadyCallback();

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Woodpecker API',
          width: 1200,
          height: 800,
          minWidth: 800,
          minHeight: 600,
          center: true,
          show: false,
          webPreferences: expect.objectContaining({
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            sandbox: false,
          }),
        })
      );
    });

    it('should load dev server URL in development mode', async () => {
      process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173';
      
      const mockWindow = {
        loadURL: vi.fn(),
        loadFile: vi.fn(),
        show: vi.fn(),
        focus: vi.fn(),
        webContents: {
          openDevTools: vi.fn(),
          send: vi.fn(),
          on: vi.fn(),
          setWindowOpenHandler: vi.fn(),
        },
        on: vi.fn(),
        once: vi.fn((event, callback) => {
          if (event === 'ready-to-show') {
            callback();
          }
        }),
      };

      (BrowserWindow as any).mockReturnValue(mockWindow);

      await import('../main');
      
      // Simulate app ready
      const whenReadyCallback = (app.whenReady as any).mock.calls[0][0];
      await whenReadyCallback();

      expect(mockWindow.loadURL).toHaveBeenCalledWith('http://localhost:5173');
      expect(mockWindow.webContents.openDevTools).toHaveBeenCalled();
    });

    it('should load index.html in production mode', async () => {
      // No VITE_DEV_SERVER_URL means production mode
      
      const mockWindow = {
        loadURL: vi.fn(),
        loadFile: vi.fn(),
        show: vi.fn(),
        focus: vi.fn(),
        webContents: {
          openDevTools: vi.fn(),
          send: vi.fn(),
          on: vi.fn(),
          setWindowOpenHandler: vi.fn(),
        },
        on: vi.fn(),
        once: vi.fn((event, callback) => {
          if (event === 'ready-to-show') {
            callback();
          }
        }),
      };

      (BrowserWindow as any).mockReturnValue(mockWindow);

      await import('../main');
      
      // Simulate app ready
      const whenReadyCallback = (app.whenReady as any).mock.calls[0][0];
      await whenReadyCallback();

      expect(mockWindow.loadFile).toHaveBeenCalledWith(
        expect.stringContaining('index.html')
      );
      expect(mockWindow.webContents.openDevTools).not.toHaveBeenCalled();
    });
  });

  describe('Application Lifecycle', () => {
    it('should handle window-all-closed event on non-macOS platforms', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true,
      });

      await import('../main');

      // Find the window-all-closed event handler
      const windowAllClosedHandler = (app.on as any).mock.calls.find(
        (call: any) => call[0] === 'window-all-closed'
      )?.[1];

      expect(windowAllClosedHandler).toBeDefined();
      
      // Execute the handler
      windowAllClosedHandler();
      
      expect(app.quit).toHaveBeenCalled();
    });

    it('should not quit on window-all-closed on macOS', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true,
      });

      await import('../main');

      // Find the window-all-closed event handler
      const windowAllClosedHandler = (app.on as any).mock.calls.find(
        (call: any) => call[0] === 'window-all-closed'
      )?.[1];

      expect(windowAllClosedHandler).toBeDefined();
      
      // Execute the handler
      windowAllClosedHandler();
      
      expect(app.quit).not.toHaveBeenCalled();
    });

    it('should handle second-instance event', async () => {
      const mockWindow = {
        isMinimized: vi.fn(() => false),
        isVisible: vi.fn(() => true),
        restore: vi.fn(),
        show: vi.fn(),
        focus: vi.fn(),
        loadURL: vi.fn(),
        loadFile: vi.fn(),
        webContents: {
          openDevTools: vi.fn(),
          send: vi.fn(),
          on: vi.fn(),
          setWindowOpenHandler: vi.fn(),
        },
        on: vi.fn(),
        once: vi.fn(),
      };

      (BrowserWindow as any).mockReturnValue(mockWindow);

      await import('../main');

      // Find the second-instance event handler
      const secondInstanceHandler = (app.on as any).mock.calls.find(
        (call: any) => call[0] === 'second-instance'
      )?.[1];

      expect(secondInstanceHandler).toBeDefined();
      
      // Execute the handler
      secondInstanceHandler();
      
      expect(mockWindow.focus).toHaveBeenCalled();
    });
  });

  describe('Security', () => {
    it('should set up secure window open handler', async () => {
      const mockWindow = {
        loadURL: vi.fn(),
        loadFile: vi.fn(),
        webContents: {
          openDevTools: vi.fn(),
          send: vi.fn(),
          on: vi.fn(),
          setWindowOpenHandler: vi.fn(),
        },
        on: vi.fn(),
        once: vi.fn(),
      };

      (BrowserWindow as any).mockReturnValue(mockWindow);

      await import('../main');
      
      // Simulate app ready
      const whenReadyCallback = (app.whenReady as any).mock.calls[0][0];
      await whenReadyCallback();

      expect(mockWindow.webContents.setWindowOpenHandler).toHaveBeenCalled();
    });
  });
});
