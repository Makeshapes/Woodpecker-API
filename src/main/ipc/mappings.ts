import { ipcMain } from 'electron';
import { MappingsDAL } from '../../database/dal';
import { handleIpcError, validateInput } from './utils';
import type { MappingRecord, MappingFilters } from '../../database/dal';

/**
 * Setup IPC handlers for mappings table operations
 */
export function setupMappingsHandlers(): void {
  // Create mapping
  ipcMain.handle('ipc:mappings:create', async (_, data: Omit<MappingRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      validateInput(data, ['import_id', 'source_field', 'target_field']);
      return MappingsDAL.create(data);
    } catch (error) {
      return handleIpcError(error, 'mappings:create');
    }
  });

  // Get mappings by import ID
  ipcMain.handle('ipc:mappings:getByImport', async (_, importId: number) => {
    try {
      validateInput({ importId }, ['importId']);
      return MappingsDAL.getByImport(importId);
    } catch (error) {
      return handleIpcError(error, 'mappings:getByImport');
    }
  });

  // Get active mappings
  ipcMain.handle('ipc:mappings:getActive', async (_, options?: MappingFilters) => {
    try {
      return MappingsDAL.getActive(options);
    } catch (error) {
      return handleIpcError(error, 'mappings:getActive');
    }
  });

  // Update mapping
  ipcMain.handle('ipc:mappings:update', async (_, id: number, data: Partial<MappingRecord>) => {
    try {
      validateInput({ id }, ['id']);
      return MappingsDAL.update(id, data);
    } catch (error) {
      return handleIpcError(error, 'mappings:update');
    }
  });

  // Delete mapping
  ipcMain.handle('ipc:mappings:delete', async (_, id: number) => {
    try {
      validateInput({ id }, ['id']);
      return MappingsDAL.delete(id);
    } catch (error) {
      return handleIpcError(error, 'mappings:delete');
    }
  });

  console.log('Mappings IPC handlers setup complete');
}
