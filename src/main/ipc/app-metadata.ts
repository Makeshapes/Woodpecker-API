import { ipcMain } from 'electron';
import { AppMetadataDAL } from '../../database/dal';
import { handleIpcError, validateInput } from './utils';
import type { AppMetadataRecord, MetadataFilters } from '../../database/dal';

/**
 * Setup IPC handlers for app_metadata table operations
 */
export function setupAppMetadataHandlers(): void {
  // Get metadata by key
  ipcMain.handle('ipc:metadata:get', async (_, key: string) => {
    try {
      validateInput({ key }, ['key']);
      return AppMetadataDAL.get(key);
    } catch (error) {
      return handleIpcError(error, 'metadata:get');
    }
  });

  // Set metadata
  ipcMain.handle('ipc:metadata:set', async (_, key: string, value: any) => {
    try {
      validateInput({ key, value }, ['key', 'value']);
      return AppMetadataDAL.set(key, value);
    } catch (error) {
      return handleIpcError(error, 'metadata:set');
    }
  });

  // Delete metadata
  ipcMain.handle('ipc:metadata:delete', async (_, key: string) => {
    try {
      validateInput({ key }, ['key']);
      return AppMetadataDAL.delete(key);
    } catch (error) {
      return handleIpcError(error, 'metadata:delete');
    }
  });

  // Get all metadata
  ipcMain.handle('ipc:metadata:getAll', async (_, options?: MetadataFilters) => {
    try {
      return AppMetadataDAL.getAll(options);
    } catch (error) {
      return handleIpcError(error, 'metadata:getAll');
    }
  });

  console.log('App Metadata IPC handlers setup complete');
}
