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
      const record = AppMetadataDAL.getByKey(key);
      return {
        success: true,
        data: record
      };
    } catch (error) {
      return handleIpcError(error, 'metadata:get');
    }
  });

  // Set metadata
  ipcMain.handle('ipc:metadata:set', async (_, key: string, value: any) => {
    try {
      validateInput({ key, value }, ['key', 'value']);
      const valueString = typeof value === 'string' ? value : JSON.stringify(value);
      const record = AppMetadataDAL.create(key, valueString);
      return {
        success: true,
        data: record
      };
    } catch (error) {
      return handleIpcError(error, 'metadata:set');
    }
  });

  // Delete metadata
  ipcMain.handle('ipc:metadata:delete', async (_, key: string) => {
    try {
      validateInput({ key }, ['key']);
      const success = AppMetadataDAL.delete(key);
      return {
        success: true,
        data: success
      };
    } catch (error) {
      return handleIpcError(error, 'metadata:delete');
    }
  });

  // Get all metadata
  ipcMain.handle('ipc:metadata:getAll', async (_, options?: MetadataFilters) => {
    try {
      const records = AppMetadataDAL.getAll(options);
      return {
        success: true,
        data: records
      };
    } catch (error) {
      return handleIpcError(error, 'metadata:getAll');
    }
  });

  console.log('App Metadata IPC handlers setup complete');
}
