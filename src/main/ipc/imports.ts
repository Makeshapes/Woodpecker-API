import { ipcMain } from 'electron';
import { ImportsDAL } from '../../database/dal';
import { handleIpcError, validateInput } from './utils';
import type { ImportRecord, ImportFilters } from '../../database/dal';

/**
 * Setup IPC handlers for imports table operations
 */
export function setupImportsHandlers(): void {
  // Create import
  ipcMain.handle('ipc:imports:create', async (_, data: Omit<ImportRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      validateInput(data, ['filename', 'status']);
      return ImportsDAL.create(data);
    } catch (error) {
      return handleIpcError(error, 'imports:create');
    }
  });

  // Get all imports
  ipcMain.handle('ipc:imports:getAll', async (_, options?: ImportFilters) => {
    try {
      return ImportsDAL.getAll(options);
    } catch (error) {
      return handleIpcError(error, 'imports:getAll');
    }
  });

  // Get import by ID
  ipcMain.handle('ipc:imports:getById', async (_, id: number) => {
    try {
      validateInput({ id }, ['id']);
      return ImportsDAL.getById(id);
    } catch (error) {
      return handleIpcError(error, 'imports:getById');
    }
  });

  // Update import
  ipcMain.handle('ipc:imports:update', async (_, id: number, data: Partial<ImportRecord>) => {
    try {
      validateInput({ id }, ['id']);
      return ImportsDAL.update(id, data);
    } catch (error) {
      return handleIpcError(error, 'imports:update');
    }
  });

  // Delete import
  ipcMain.handle('ipc:imports:delete', async (_, id: number) => {
    try {
      validateInput({ id }, ['id']);
      return ImportsDAL.delete(id);
    } catch (error) {
      return handleIpcError(error, 'imports:delete');
    }
  });

  console.log('Imports IPC handlers setup complete');
}
