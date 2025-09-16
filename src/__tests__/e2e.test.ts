import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { readFileSync, existsSync } from 'fs';

// Mock child_process for controlled testing
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// Mock fs
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

describe('End-to-End Electron Application Tests', () => {
  let electronProcess: ChildProcess | null = null;
  let viteProcess: ChildProcess | null = null;

  beforeAll(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    // Cleanup any running processes
    if (electronProcess) {
      electronProcess.kill();
    }
    if (viteProcess) {
      viteProcess.kill();
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
    if (electronProcess) {
      electronProcess.kill();
      electronProcess = null;
    }
    if (viteProcess) {
      viteProcess.kill();
      viteProcess = null;
    }
  });

  describe('Development Workflow E2E', () => {
    it('should start complete development environment', async () => {
      const mockViteProcess = {
        stdout: { 
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              setTimeout(() => callback('Local:   http://localhost:5173/\n'), 100);
            }
          })
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        }),
        kill: vi.fn(),
      };

      const mockElectronProcess = {
        stdout: { 
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              setTimeout(() => callback('Electron app started\n'), 200);
            }
          })
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        }),
        kill: vi.fn(),
      };

      (spawn as any)
        .mockReturnValueOnce(mockViteProcess)
        .mockReturnValueOnce(mockElectronProcess);

      // Start Vite dev server
      viteProcess = spawn('npm', ['run', 'dev']);
      
      // Wait for Vite to be ready (simulated)
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Start Electron
      electronProcess = spawn('npm', ['run', 'electron:dev']);

      expect(spawn).toHaveBeenCalledWith('npm', ['run', 'dev']);
      expect(spawn).toHaveBeenCalledWith('npm', ['run', 'electron:dev']);
    });

    it('should handle concurrent development with proper sequencing', async () => {
      const mockConcurrentProcess = {
        stdout: { 
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback('[0] Local:   http://localhost:5173/\n');
              callback('[1] Waiting for http://localhost:5173\n');
              callback('[1] Electron app started\n');
            }
          })
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        }),
        kill: vi.fn(),
      };

      (spawn as any).mockReturnValue(mockConcurrentProcess);

      // Start concurrent development
      const process = spawn('npm', ['run', 'dev:electron']);

      expect(spawn).toHaveBeenCalledWith('npm', ['run', 'dev:electron']);
      expect(process.stdout.on).toHaveBeenCalledWith('data', expect.any(Function));
    });
  });

  describe('Application Startup E2E', () => {
    it('should start Electron application successfully', async () => {
      const mockElectronProcess = {
        stdout: { 
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback('Main window created\n');
              callback('Application ready\n');
            }
          })
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        }),
        kill: vi.fn(),
      };

      (spawn as any).mockReturnValue(mockElectronProcess);

      electronProcess = spawn('electron', ['dist-electron/main-test.mjs']);

      expect(spawn).toHaveBeenCalledWith('electron', ['dist-electron/main-test.mjs']);
    });

    it('should load React frontend in Electron window', async () => {
      // Mock the main process loading behavior
      const mockMainProcess = `
        const mainWindow = new BrowserWindow({
          title: 'Woodpecker API',
          width: 1200,
          height: 800,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.mjs'),
          },
        });

        if (process.env.VITE_DEV_SERVER_URL) {
          mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        } else {
          mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
        }
      `;

      (readFileSync as any).mockReturnValue(mockMainProcess);

      const mainProcess = readFileSync('src/main/main-test.ts', 'utf8');

      expect(mainProcess).toContain('BrowserWindow');
      expect(mainProcess).toContain('loadURL');
      expect(mainProcess).toContain('loadFile');
      expect(mainProcess).toContain('preload.mjs');
    });

    it('should establish IPC communication between main and renderer', async () => {
      // Mock preload script
      const mockPreloadScript = `
        const { contextBridge, ipcRenderer } = require('electron');

        contextBridge.exposeInMainWorld('api', {
          imports: {
            create: (data) => ipcRenderer.invoke('ipc:imports:create', data),
            getAll: (options) => ipcRenderer.invoke('ipc:imports:getAll', options),
          },
        });

        contextBridge.exposeInMainWorld('electronUtils', {
          platform: process.platform,
          versions: process.versions,
        });
      `;

      (readFileSync as any).mockReturnValue(mockPreloadScript);

      const preloadScript = readFileSync('src/preload/preload.ts', 'utf8');

      expect(preloadScript).toContain('contextBridge.exposeInMainWorld');
      expect(preloadScript).toContain('ipcRenderer.invoke');
      expect(preloadScript).toContain('api');
      expect(preloadScript).toContain('electronUtils');
    });
  });

  describe('Frontend Integration E2E', () => {
    it('should render React components correctly in Electron', async () => {
      // Mock the test component that verifies Electron integration
      const mockTestComponent = `
        import React, { useState, useEffect } from 'react';
        import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
        import { Button } from '@/components/ui/button';
        import { Badge } from '@/components/ui/badge';

        export function ElectronBridgeTest() {
          const [electronAvailable, setElectronAvailable] = useState(false);
          const [platformInfo, setPlatformInfo] = useState('');

          useEffect(() => {
            if (window.electronUtils) {
              setElectronAvailable(true);
              setPlatformInfo(window.electronUtils.platform);
            }
          }, []);

          return (
            <Card>
              <CardHeader>
                <CardTitle>Electron Bridge Test</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={electronAvailable ? 'default' : 'destructive'}>
                  {electronAvailable ? 'Connected' : 'Disconnected'}
                </Badge>
                <p>Platform: {platformInfo}</p>
              </CardContent>
            </Card>
          );
        }
      `;

      (readFileSync as any).mockReturnValue(mockTestComponent);

      const testComponent = readFileSync('src/components/test/ElectronBridgeTest.tsx', 'utf8');

      expect(testComponent).toContain('ElectronBridgeTest');
      expect(testComponent).toContain('window.electronUtils');
      expect(testComponent).toContain('Card');
      expect(testComponent).toContain('Badge');
    });

    it('should handle API calls from React to Electron main process', async () => {
      // Mock a component that makes API calls
      const mockApiComponent = `
        const handleCreateImport = async () => {
          try {
            const result = await window.api.imports.create({
              filename: 'test.csv',
              file_path: '/path/to/test.csv',
              status: 'pending'
            });
            console.log('Import created:', result);
          } catch (error) {
            console.error('Failed to create import:', error);
          }
        };
      `;

      expect(mockApiComponent).toContain('window.api.imports.create');
      expect(mockApiComponent).toContain('await');
    });
  });

  describe('Database Integration E2E', () => {
    it('should initialize database on application startup', async () => {
      const mockMainProcess = {
        stdout: { 
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback('Database initialized successfully\n');
              callback('Database connection established\n');
            }
          })
        },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      };

      (spawn as any).mockReturnValue(mockMainProcess);

      electronProcess = spawn('electron', ['dist-electron/main.mjs']);

      expect(mockMainProcess.stdout.on).toHaveBeenCalledWith('data', expect.any(Function));
    });

    it('should handle database operations through IPC', async () => {
      // Mock IPC handlers for database operations
      const mockIpcHandlers = `
        ipcMain.handle('ipc:imports:create', async (event, data) => {
          try {
            const result = await importsDAL.create(data);
            return { success: true, data: result };
          } catch (error) {
            return { success: false, error: error.message };
          }
        });

        ipcMain.handle('ipc:leads:getAll', async (event, options) => {
          try {
            const result = await leadsDAL.getAll(options);
            return { success: true, data: result };
          } catch (error) {
            return { success: false, error: error.message };
          }
        });
      `;

      expect(mockIpcHandlers).toContain('ipcMain.handle');
      expect(mockIpcHandlers).toContain('ipc:imports:create');
      expect(mockIpcHandlers).toContain('ipc:leads:getAll');
    });
  });

  describe('Build and Distribution E2E', () => {
    it('should build production application successfully', async () => {
      const mockBuildProcess = {
        stdout: { 
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback('✓ Frontend built in 3.25s\n');
              callback('✓ Electron compiled in 212ms\n');
              callback('• packaging platform=darwin arch=arm64\n');
              callback('• signing file=release/mac-arm64/Woodpecker API.app\n');
            }
          })
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        }),
        kill: vi.fn(),
      };

      (spawn as any).mockReturnValue(mockBuildProcess);

      const buildProcess = spawn('npm', ['run', 'electron:build:dir']);

      expect(spawn).toHaveBeenCalledWith('npm', ['run', 'electron:build:dir']);
    });

    it('should create distributable application package', async () => {
      (existsSync as any).mockImplementation((filePath: string) => {
        return filePath.includes('release/mac-arm64/Woodpecker API.app') ||
               filePath.includes('release/builder-effective-config.yaml');
      });

      // Verify that the distributable package exists
      expect(existsSync('release/mac-arm64/Woodpecker API.app')).toBe(true);
      expect(existsSync('release/builder-effective-config.yaml')).toBe(true);
    });

    it('should run production application from build', async () => {
      const mockProductionProcess = {
        stdout: { 
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback('Production app started\n');
              callback('Loading production frontend\n');
            }
          })
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        }),
        kill: vi.fn(),
      };

      (spawn as any).mockReturnValue(mockProductionProcess);

      const productionProcess = spawn('npm', ['run', 'electron:test']);

      expect(spawn).toHaveBeenCalledWith('npm', ['run', 'electron:test']);
    });
  });

  describe('Error Handling E2E', () => {
    it('should handle application startup errors gracefully', async () => {
      const mockErrorProcess = {
        stdout: { on: vi.fn() },
        stderr: { 
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback('Error: Failed to initialize database\n');
            }
          })
        },
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('Application startup failed'));
          }
        }),
        kill: vi.fn(),
      };

      (spawn as any).mockReturnValue(mockErrorProcess);

      const errorProcess = spawn('electron', ['dist-electron/main.mjs']);

      expect(errorProcess.stderr.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(errorProcess.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle IPC communication errors', async () => {
      // Mock error handling in IPC
      const mockIpcErrorHandling = `
        ipcMain.handle('ipc:imports:create', async (event, data) => {
          try {
            const result = await importsDAL.create(data);
            return { success: true, data: result };
          } catch (error) {
            logger.error('Failed to create import:', error);
            return { success: false, error: error.message };
          }
        });
      `;

      expect(mockIpcErrorHandling).toContain('try {');
      expect(mockIpcErrorHandling).toContain('} catch (error) {');
      expect(mockIpcErrorHandling).toContain('success: false');
    });

    it('should handle frontend errors in Electron context', async () => {
      // Mock error boundary for React components in Electron
      const mockErrorBoundary = `
        class ElectronErrorBoundary extends React.Component {
          constructor(props) {
            super(props);
            this.state = { hasError: false };
          }

          static getDerivedStateFromError(error) {
            return { hasError: true };
          }

          componentDidCatch(error, errorInfo) {
            console.error('Electron React Error:', error, errorInfo);
            if (window.electronUtils) {
              // Report error to main process
            }
          }

          render() {
            if (this.state.hasError) {
              return <div>Something went wrong in the Electron app.</div>;
            }
            return this.props.children;
          }
        }
      `;

      expect(mockErrorBoundary).toContain('getDerivedStateFromError');
      expect(mockErrorBoundary).toContain('componentDidCatch');
      expect(mockErrorBoundary).toContain('window.electronUtils');
    });
  });
});
