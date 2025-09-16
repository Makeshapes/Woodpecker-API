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
      external: [
        'electron',
        'better-sqlite3',
        'node:url',
        'node:path',
        'path',
        'fs',
        'os',
        'crypto',
        'util',
        'events',
        'stream',
        'buffer',
        'child_process'
      ],
      output: {
        dir: 'dist-electron',
        entryFileNames: '[name].mjs',
      },
    },
    outDir: 'dist-electron',
    emptyOutDir: true,
    target: 'node18',
    minify: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
