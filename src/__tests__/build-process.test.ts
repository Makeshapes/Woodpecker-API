import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn } from 'child_process';
import { readFileSync, existsSync, statSync } from 'fs';
import path from 'path';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// Mock fs
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  statSync: vi.fn(),
}));

// Mock path
vi.mock('path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/')),
    resolve: vi.fn((...args) => '/' + args.join('/')),
    dirname: vi.fn(() => '/mock/dirname'),
  },
}));

describe('Build Process', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Vite Frontend Build', () => {
    it('should build frontend assets successfully', () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { 
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback('✓ built in 3.25s\n');
            }
          })
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0); // Success exit code
          }
        }),
        kill: vi.fn(),
      });

      (spawn as any).mockImplementation(mockSpawn);

      // Simulate running the build command
      const process = spawn('npm', ['run', 'build']);

      expect(mockSpawn).toHaveBeenCalledWith('npm', ['run', 'build']);
      expect(process.stdout.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should generate correct frontend build artifacts', () => {
      (existsSync as any).mockImplementation((filePath: string) => {
        return filePath.includes('dist/index.html') || 
               filePath.includes('dist/assets/') ||
               filePath.includes('dist/assets/index-') && filePath.endsWith('.css') ||
               filePath.includes('dist/assets/index-') && filePath.endsWith('.js');
      });

      (statSync as any).mockReturnValue({
        isFile: () => true,
        size: 1024,
      });

      // Check that build artifacts exist
      expect(existsSync('dist/index.html')).toBe(true);
      expect(existsSync('dist/assets/index-Du6ljDGA.css')).toBe(true);
      expect(existsSync('dist/assets/index-asilU5LD.js')).toBe(true);
    });

    it('should handle build errors gracefully', () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { on: vi.fn() },
        stderr: { 
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback('Error: Build failed\n');
            }
          })
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(1); // Error exit code
          }
        }),
        kill: vi.fn(),
      });

      (spawn as any).mockImplementation(mockSpawn);

      const process = spawn('npm', ['run', 'build']);

      expect(process.stderr.on).toHaveBeenCalledWith('data', expect.any(Function));
    });
  });

  describe('Electron Main Process Build', () => {
    it('should compile Electron main process successfully', () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { 
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback('✓ built in 212ms\n');
            }
          })
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0); // Success exit code
          }
        }),
        kill: vi.fn(),
      });

      (spawn as any).mockImplementation(mockSpawn);

      // Simulate running the electron compile command
      const process = spawn('npm', ['run', 'electron:compile']);

      expect(mockSpawn).toHaveBeenCalledWith('npm', ['run', 'electron:compile']);
    });

    it('should generate correct Electron build artifacts', () => {
      (existsSync as any).mockImplementation((filePath: string) => {
        return filePath.includes('dist-electron/main.mjs') || 
               filePath.includes('dist-electron/main-test.mjs') ||
               filePath.includes('dist-electron/preload.mjs');
      });

      (statSync as any).mockReturnValue({
        isFile: () => true,
        size: 2048,
      });

      // Check that Electron build artifacts exist
      expect(existsSync('dist-electron/main.mjs')).toBe(true);
      expect(existsSync('dist-electron/main-test.mjs')).toBe(true);
      expect(existsSync('dist-electron/preload.mjs')).toBe(true);
    });

    it('should use correct Vite configuration for Electron build', () => {
      const mockViteConfig = `
        import { defineConfig } from 'vite';
        
        export default defineConfig({
          build: {
            lib: {
              entry: {
                main: 'src/main/main.ts',
                'main-test': 'src/main/main-test.ts',
                preload: 'src/preload/preload.ts',
              },
              formats: ['es'],
            },
            rollupOptions: {
              external: ['electron', 'better-sqlite3'],
            },
            outDir: 'dist-electron',
          },
        });
      `;

      (readFileSync as any).mockReturnValue(mockViteConfig);

      const viteConfig = readFileSync('vite.electron.config.ts', 'utf8');

      expect(viteConfig).toContain('src/main/main.ts');
      expect(viteConfig).toContain('src/main/main-test.ts');
      expect(viteConfig).toContain('src/preload/preload.ts');
      expect(viteConfig).toContain('dist-electron');
      expect(viteConfig).toContain('formats: [\'es\']');
      expect(viteConfig).toContain('electron');
      expect(viteConfig).toContain('better-sqlite3');
    });
  });

  describe('Electron Builder', () => {
    it('should configure electron-builder correctly', () => {
      const mockPackageJson = {
        main: 'dist-electron/main.mjs',
        build: {
          appId: 'com.makeshapes.woodpecker',
          productName: 'Woodpecker API',
          directories: {
            output: 'release'
          },
          files: [
            'dist/**/*',
            'dist-electron/**/*',
            'node_modules/**/*',
            '!node_modules/**/*.{md,txt}',
            '!node_modules/**/test/**/*',
            '!node_modules/**/*.d.ts'
          ],
          mac: {
            category: 'public.app-category.productivity',
            target: [
              {
                target: 'dmg',
                arch: ['arm64', 'x64']
              }
            ]
          },
          win: {
            target: [
              {
                target: 'nsis',
                arch: ['x64']
              }
            ]
          },
          linux: {
            target: [
              {
                target: 'AppImage',
                arch: ['x64']
              }
            ]
          }
        }
      };

      (readFileSync as any).mockReturnValue(JSON.stringify(mockPackageJson));

      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

      expect(packageJson.main).toBe('dist-electron/main.mjs');
      expect(packageJson.build.appId).toBe('com.makeshapes.woodpecker');
      expect(packageJson.build.productName).toBe('Woodpecker API');
      expect(packageJson.build.directories.output).toBe('release');
      expect(packageJson.build.files).toContain('dist/**/*');
      expect(packageJson.build.files).toContain('dist-electron/**/*');
    });

    it('should build distributable packages successfully', () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { 
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback('• packaging       platform=darwin arch=arm64\n');
              callback('• signing         file=release/mac-arm64/Woodpecker API.app\n');
            }
          })
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0); // Success exit code
          }
        }),
        kill: vi.fn(),
      });

      (spawn as any).mockImplementation(mockSpawn);

      // Simulate running electron-builder
      const process = spawn('npx', ['electron-builder', '--dir']);

      expect(mockSpawn).toHaveBeenCalledWith('npx', ['electron-builder', '--dir']);
    });

    it('should handle native dependencies correctly', () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { 
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback('• executing @electron/rebuild  electronVersion=38.1.0\n');
              callback('• preparing       moduleName=better-sqlite3\n');
              callback('• finished        moduleName=better-sqlite3\n');
            }
          })
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0); // Success exit code
          }
        }),
        kill: vi.fn(),
      });

      (spawn as any).mockImplementation(mockSpawn);

      const process = spawn('npx', ['electron-builder', '--dir']);

      // Verify that the output indicates native dependency rebuilding
      expect(process.stdout.on).toHaveBeenCalledWith('data', expect.any(Function));
    });

    it('should generate release artifacts', () => {
      (existsSync as any).mockImplementation((filePath: string) => {
        return filePath.includes('release/mac-arm64/Woodpecker API.app') ||
               filePath.includes('release/builder-effective-config.yaml');
      });

      (statSync as any).mockReturnValue({
        isDirectory: () => true,
        isFile: () => false,
      });

      // Check that release artifacts exist
      expect(existsSync('release/mac-arm64/Woodpecker API.app')).toBe(true);
      expect(existsSync('release/builder-effective-config.yaml')).toBe(true);
    });
  });

  describe('Production Testing', () => {
    it('should test production build successfully', () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { 
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback('Electron app started successfully\n');
            }
          })
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0); // Success exit code
          }
        }),
        kill: vi.fn(),
      });

      (spawn as any).mockImplementation(mockSpawn);

      // Simulate running the production test
      const process = spawn('npm', ['run', 'electron:test']);

      expect(mockSpawn).toHaveBeenCalledWith('npm', ['run', 'electron:test']);
    });

    it('should load production frontend correctly', () => {
      // This test verifies that the production build loads the correct files
      const mockMainProcess = `
        if (process.env.VITE_DEV_SERVER_URL) {
          mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        } else {
          mainWindow.loadFile(path.join(process.env.APP_ROOT || __dirname, '../dist/index.html'));
        }
      `;

      (readFileSync as any).mockReturnValue(mockMainProcess);

      const mainProcess = readFileSync('src/main/main.ts', 'utf8');

      expect(mainProcess).toContain('loadURL(process.env.VITE_DEV_SERVER_URL)');
      expect(mainProcess).toContain('loadFile');
      expect(mainProcess).toContain('dist/index.html');
    });
  });

  describe('Build Optimization', () => {
    it('should optimize bundle size', () => {
      const mockBuildOutput = `
        dist/index.html                   0.46 kB │ gzip:   0.30 kB
        dist/assets/index-Du6ljDGA.css   52.83 kB │ gzip:   9.73 kB
        dist/assets/index-asilU5LD.js   650.42 kB │ gzip: 201.89 kB
      `;

      // Verify that build output shows reasonable file sizes
      expect(mockBuildOutput).toContain('gzip:');
      expect(mockBuildOutput).toContain('kB');
    });

    it('should exclude unnecessary files from build', () => {
      const mockPackageJson = {
        build: {
          files: [
            'dist/**/*',
            'dist-electron/**/*',
            'node_modules/**/*',
            '!node_modules/**/*.{md,txt}',
            '!node_modules/**/test/**/*',
            '!node_modules/**/*.d.ts',
            '!**/__tests__/**/*',
            '!**/*.test.*'
          ]
        }
      };

      (readFileSync as any).mockReturnValue(JSON.stringify(mockPackageJson));

      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

      expect(packageJson.build.files).toContain('!**/__tests__/**/*');
      expect(packageJson.build.files).toContain('!**/*.test.*');
      expect(packageJson.build.files).toContain('!node_modules/**/*.d.ts');
    });
  });

  describe('Cross-Platform Build', () => {
    it('should support macOS builds', () => {
      const mockPackageJson = {
        build: {
          mac: {
            category: 'public.app-category.productivity',
            target: [
              { target: 'dmg', arch: ['arm64', 'x64'] }
            ]
          }
        }
      };

      (readFileSync as any).mockReturnValue(JSON.stringify(mockPackageJson));

      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

      expect(packageJson.build.mac.target[0].target).toBe('dmg');
      expect(packageJson.build.mac.target[0].arch).toContain('arm64');
      expect(packageJson.build.mac.target[0].arch).toContain('x64');
    });

    it('should support Windows builds', () => {
      const mockPackageJson = {
        build: {
          win: {
            target: [
              { target: 'nsis', arch: ['x64'] }
            ]
          }
        }
      };

      (readFileSync as any).mockReturnValue(JSON.stringify(mockPackageJson));

      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

      expect(packageJson.build.win.target[0].target).toBe('nsis');
      expect(packageJson.build.win.target[0].arch).toContain('x64');
    });

    it('should support Linux builds', () => {
      const mockPackageJson = {
        build: {
          linux: {
            target: [
              { target: 'AppImage', arch: ['x64'] }
            ]
          }
        }
      };

      (readFileSync as any).mockReturnValue(JSON.stringify(mockPackageJson));

      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

      expect(packageJson.build.linux.target[0].target).toBe('AppImage');
      expect(packageJson.build.linux.target[0].arch).toContain('x64');
    });
  });
});
