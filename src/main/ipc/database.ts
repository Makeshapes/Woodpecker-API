import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { getDatabasePath } from '../../database/init';
import { handleIpcError } from './utils';
import { logger } from '../utils/logger';
import { dbPool } from '../../database/utils';

/**
 * Setup IPC handlers for database operations
 */
export function setupDatabaseHandlers(): void {
  // Clear database - removes the database file completely
  ipcMain.handle('ipc:database:clear', async () => {
    try {
      const dbPath = getDatabasePath();

      logger.info(`[Database] Clearing database at: ${dbPath}`);
      console.log(`🗑️ [Database] Clearing database at: ${dbPath}`);

      // Close all database connections first
      console.log(`🔒 [Database] Closing all database connections...`);
      logger.info(`[Database] Closing all database connections...`);
      dbPool.closeAll();

      // Wait a moment for connections to fully close
      await new Promise(resolve => setTimeout(resolve, 500));

      let filesRemoved = 0;

      // Remove main database file
      if (fs.existsSync(dbPath)) {
        const statsBefore = fs.statSync(dbPath);
        fs.unlinkSync(dbPath);
        filesRemoved++;
        logger.info(`[Database] Removed main database file: ${dbPath} (was ${statsBefore.size} bytes)`);
        console.log(`🗑️ [Database] Removed main database file: ${dbPath} (was ${statsBefore.size} bytes)`);
      } else {
        logger.info(`[Database] Main database file did not exist: ${dbPath}`);
        console.log(`⚠️ [Database] Main database file did not exist: ${dbPath}`);
      }

      // Remove WAL file if it exists
      const walPath = `${dbPath}-wal`;
      if (fs.existsSync(walPath)) {
        const statsBefore = fs.statSync(walPath);
        fs.unlinkSync(walPath);
        filesRemoved++;
        logger.info(`[Database] Removed WAL file: ${walPath} (was ${statsBefore.size} bytes)`);
        console.log(`🗑️ [Database] Removed WAL file: ${walPath} (was ${statsBefore.size} bytes)`);
      }

      // Remove SHM file if it exists
      const shmPath = `${dbPath}-shm`;
      if (fs.existsSync(shmPath)) {
        const statsBefore = fs.statSync(shmPath);
        fs.unlinkSync(shmPath);
        filesRemoved++;
        logger.info(`[Database] Removed SHM file: ${shmPath} (was ${statsBefore.size} bytes)`);
        console.log(`🗑️ [Database] Removed SHM file: ${shmPath} (was ${statsBefore.size} bytes)`);
      }

      logger.info(`[Database] Database cleared successfully - removed ${filesRemoved} files`);
      console.log(`✅ [Database] Database cleared successfully - removed ${filesRemoved} files`);

      // Verify files are gone
      const mainExists = fs.existsSync(dbPath);
      const walExists = fs.existsSync(walPath);
      const shmExists = fs.existsSync(shmPath);

      console.log(`🔍 [Database] Post-clear verification:`);
      console.log(`   Main DB exists: ${mainExists}`);
      console.log(`   WAL exists: ${walExists}`);
      console.log(`   SHM exists: ${shmExists}`);

      return {
        success: true,
        filesRemoved,
        verification: {
          mainExists,
          walExists,
          shmExists
        }
      };

    } catch (error) {
      logger.error('[Database] Error clearing database:', error);
      console.error('💥 [Database] Error clearing database:', error);
      return handleIpcError(error, 'database:clear');
    }
  });

  console.log('Database IPC handlers setup complete');
}