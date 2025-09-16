import { ipcMain } from 'electron';
import { GeneratedContentDAL } from '../../database/dal';
import { handleIpcError, validateInput } from './utils';
import type { GeneratedContentRecord, ContentFilters } from '../../database/dal';

/**
 * Setup IPC handlers for generated_content table operations
 */
export function setupGeneratedContentHandlers(): void {
  // Create generated content
  ipcMain.handle('ipc:content:create', async (_, data: Omit<GeneratedContentRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      validateInput(data, ['lead_id', 'touchpoint_number', 'content_type']);
      return GeneratedContentDAL.create(data);
    } catch (error) {
      return handleIpcError(error, 'content:create');
    }
  });

  // Get content by lead ID
  ipcMain.handle('ipc:content:getByLead', async (_, leadId: number) => {
    try {
      validateInput({ leadId }, ['leadId']);
      return GeneratedContentDAL.getByLead(leadId);
    } catch (error) {
      return handleIpcError(error, 'content:getByLead');
    }
  });

  // Get content by touchpoint
  ipcMain.handle('ipc:content:getByTouchpoint', async (_, touchpoint: number, options?: ContentFilters) => {
    try {
      validateInput({ touchpoint }, ['touchpoint']);
      return GeneratedContentDAL.getByTouchpoint(touchpoint, options);
    } catch (error) {
      return handleIpcError(error, 'content:getByTouchpoint');
    }
  });

  // Update generated content
  ipcMain.handle('ipc:content:update', async (_, id: number, data: Partial<GeneratedContentRecord>) => {
    try {
      validateInput({ id }, ['id']);
      return GeneratedContentDAL.update(id, data);
    } catch (error) {
      return handleIpcError(error, 'content:update');
    }
  });

  // Delete generated content
  ipcMain.handle('ipc:content:delete', async (_, id: number) => {
    try {
      validateInput({ id }, ['id']);
      return GeneratedContentDAL.delete(id);
    } catch (error) {
      return handleIpcError(error, 'content:delete');
    }
  });

  console.log('Generated Content IPC handlers setup complete');
}
