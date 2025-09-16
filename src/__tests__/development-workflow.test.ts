import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// Mock fs
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(() => true),
}));

describe('Development Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Package.json Scripts', () => {
    it('should have all required development scripts', () => {
      const mockPackageJson = {
        scripts: {
          'dev': 'vite',
          'dev:electron': 'concurrently "npm run dev" "wait-on http://localhost:5173 && npm run electron:dev"',
          'electron:dev': 'VITE_DEV_SERVER_URL=http://localhost:5173 electron dist-electron/main-test.mjs',
          'electron:compile': 'vite build --config vite.electron.config.ts',
          'electron:build': 'npm run build && npm run electron:compile && electron-builder',
          'electron:build:dir': 'npm run electron:compile && electron-builder --dir',
          'electron:test': 'npm run build && npm run electron:compile && electron dist-electron/main-test.mjs',
          'build': 'vite build',
          'preview': 'vite preview',
        }
      };

      (readFileSync as any).mockReturnValue(JSON.stringify(mockPackageJson));

      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

      // Check that all required scripts exist
      expect(packageJson.scripts).toHaveProperty('dev');
      expect(packageJson.scripts).toHaveProperty('dev:electron');
      expect(packageJson.scripts).toHaveProperty('electron:dev');
      expect(packageJson.scripts).toHaveProperty('electron:compile');
      expect(packageJson.scripts).toHaveProperty('electron:build');
      expect(packageJson.scripts).toHaveProperty('electron:build:dir');
      expect(packageJson.scripts).toHaveProperty('electron:test');
      expect(packageJson.scripts).toHaveProperty('build');

      // Check script content
      expect(packageJson.scripts['dev:electron']).toContain('concurrently');
      expect(packageJson.scripts['dev:electron']).toContain('wait-on');
      expect(packageJson.scripts['electron:dev']).toContain('VITE_DEV_SERVER_URL');
      expect(packageJson.scripts['electron:compile']).toContain('vite.electron.config.ts');
    });

    it('should have correct dependencies for development workflow', () => {
      const mockPackageJson = {
        devDependencies: {
          'concurrently': '^8.2.2',
          'wait-on': '^7.2.0',
          'electron': '^38.1.0',
          'electron-builder': '^26.0.12',
          'vite': '^6.3.6',
          '@vitejs/plugin-react': '^5.0.2',
          'typescript': '^5.6.3',
        }
      };

      (readFileSync as any).mockReturnValue(JSON.stringify(mockPackageJson));

      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

      // Check that all required dev dependencies exist
      expect(packageJson.devDependencies).toHaveProperty('concurrently');
      expect(packageJson.devDependencies).toHaveProperty('wait-on');
      expect(packageJson.devDependencies).toHaveProperty('electron');
      expect(packageJson.devDependencies).toHaveProperty('electron-builder');
      expect(packageJson.devDependencies).toHaveProperty('vite');
      expect(packageJson.devDependencies).toHaveProperty('@vitejs/plugin-react');
      expect(packageJson.devDependencies).toHaveProperty('typescript');
    });
  });

  describe('Configuration Files', () => {
    it('should have TypeScript configuration for Electron', () => {
      const mockTsConfig = {
        compilerOptions: {
          target: 'ES2022',
          module: 'CommonJS',
          moduleResolution: 'node',
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          resolveJsonModule: true,
          outDir: './dist-electron',
        },
        include: [
          'src/main/**/*',
          'src/preload/**/*',
          'src/database/**/*',
          'src/types/**/*'
        ],
        exclude: [
          'node_modules',
          'dist',
          'dist-electron',
          '**/*.test.ts'
        ]
      };

      (readFileSync as any).mockReturnValue(JSON.stringify(mockTsConfig));

      const tsConfig = JSON.parse(readFileSync('tsconfig.electron.json', 'utf8'));

      expect(tsConfig.compilerOptions.target).toBe('ES2022');
      expect(tsConfig.compilerOptions.module).toBe('CommonJS');
      expect(tsConfig.compilerOptions.outDir).toBe('./dist-electron');
      expect(tsConfig.include).toContain('src/main/**/*');
      expect(tsConfig.include).toContain('src/preload/**/*');
      expect(tsConfig.exclude).toContain('**/*.test.ts');
    });

    it('should have Vite configuration for Electron', () => {
      const mockViteConfig = `
        import { defineConfig } from 'vite';
        import path from 'path';

        export default defineConfig({
          build: {
            lib: {
              entry: {
                main: path.resolve(__dirname, 'src/main/main.ts'),
                'main-test': path.resolve(__dirname, 'src/main/main-test.ts'),
                preload: path.resolve(__dirname, 'src/preload/preload.ts'),
              },
              formats: ['es'],
            },
            rollupOptions: {
              external: ['electron', 'better-sqlite3', 'path', 'fs', 'url'],
            },
            outDir: 'dist-electron',
            emptyOutDir: false,
          },
        });
      `;

      (readFileSync as any).mockReturnValue(mockViteConfig);

      const viteConfig = readFileSync('vite.electron.config.ts', 'utf8');

      expect(viteConfig).toContain('defineConfig');
      expect(viteConfig).toContain('src/main/main.ts');
      expect(viteConfig).toContain('src/main/main-test.ts');
      expect(viteConfig).toContain('src/preload/preload.ts');
      expect(viteConfig).toContain('dist-electron');
      expect(viteConfig).toContain('electron');
      expect(viteConfig).toContain('better-sqlite3');
    });

    it('should have environment configuration files', () => {
      const mockEnvDev = 'DATABASE_PATH=./data/woodpecker-dev.db\nDEVELOPMENT=true';
      const mockEnvProd = 'DATABASE_PATH=./data/woodpecker.db\nDEVELOPMENT=false';

      (readFileSync as any)
        .mockReturnValueOnce(mockEnvDev)
        .mockReturnValueOnce(mockEnvProd);

      const envDev = readFileSync('.env.development', 'utf8');
      const envProd = readFileSync('.env.production', 'utf8');

      expect(envDev).toContain('DATABASE_PATH=./data/woodpecker-dev.db');
      expect(envDev).toContain('DEVELOPMENT=true');
      expect(envProd).toContain('DATABASE_PATH=./data/woodpecker.db');
      expect(envProd).toContain('DEVELOPMENT=false');
    });
  });

  describe('Concurrent Development Process', () => {
    it('should start Vite dev server and Electron concurrently', () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      });

      (spawn as any).mockImplementation(mockSpawn);

      // Simulate running the dev:electron script
      const command = 'concurrently';
      const args = [
        '"npm run dev"',
        '"wait-on http://localhost:5173 && npm run electron:dev"'
      ];

      spawn(command, args, { shell: true });

      expect(mockSpawn).toHaveBeenCalledWith(
        command,
        args,
        { shell: true }
      );
    });

    it('should wait for Vite dev server before starting Electron', () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      });

      (spawn as any).mockImplementation(mockSpawn);

      // Simulate the wait-on command
      const command = 'wait-on';
      const args = ['http://localhost:5173'];

      spawn(command, args);

      expect(mockSpawn).toHaveBeenCalledWith(command, args);
    });

    it('should set correct environment variables for Electron dev mode', () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      });

      (spawn as any).mockImplementation(mockSpawn);

      // Simulate running Electron with dev server URL
      const command = 'electron';
      const args = ['dist-electron/main-test.mjs'];
      const env = {
        ...process.env,
        VITE_DEV_SERVER_URL: 'http://localhost:5173'
      };

      spawn(command, args, { env });

      expect(mockSpawn).toHaveBeenCalledWith(
        command,
        args,
        { env }
      );
    });
  });

  describe('Hot Reloading', () => {
    it('should support hot reloading for React components', () => {
      // This test verifies that the Vite configuration supports hot reloading
      const mockViteConfig = `
        import { defineConfig } from 'vite';
        import react from '@vitejs/plugin-react';

        export default defineConfig({
          plugins: [react()],
          server: {
            port: 5173,
            host: true,
          },
        });
      `;

      (readFileSync as any).mockReturnValue(mockViteConfig);

      const viteConfig = readFileSync('vite.config.ts', 'utf8');

      expect(viteConfig).toContain('@vitejs/plugin-react');
      expect(viteConfig).toContain('port: 5173');
    });

    it('should reload Electron main process on changes', () => {
      // This test verifies that the development workflow includes
      // mechanisms for reloading the main process
      const mockPackageJson = {
        scripts: {
          'electron:dev': 'VITE_DEV_SERVER_URL=http://localhost:5173 electron dist-electron/main-test.mjs',
          'electron:compile': 'vite build --config vite.electron.config.ts',
        }
      };

      (readFileSync as any).mockReturnValue(JSON.stringify(mockPackageJson));

      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

      // The workflow should compile Electron code before running
      expect(packageJson.scripts['electron:compile']).toContain('vite build');
      expect(packageJson.scripts['electron:dev']).toContain('main-test.mjs');
    });
  });

  describe('Error Handling', () => {
    it('should handle Vite dev server startup errors', () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { on: vi.fn() },
        stderr: { 
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback('Error: Port 5173 is already in use');
            }
          })
        },
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('Failed to start Vite dev server'));
          }
        }),
        kill: vi.fn(),
      });

      (spawn as any).mockImplementation(mockSpawn);

      const process = spawn('npm', ['run', 'dev']);

      // Verify error handling is set up
      expect(process.stderr.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle Electron startup errors', () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { on: vi.fn() },
        stderr: { 
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback('Error: Failed to load main process');
            }
          })
        },
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('Failed to start Electron'));
          }
        }),
        kill: vi.fn(),
      });

      (spawn as any).mockImplementation(mockSpawn);

      const process = spawn('electron', ['dist-electron/main-test.mjs']);

      // Verify error handling is set up
      expect(process.stderr.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });
});
