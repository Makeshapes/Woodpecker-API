import { ipcMain } from 'electron';
import { GeneratedContentDAL } from '../../database/dal';
import { handleIpcError, validateInput } from './utils';
import type { GeneratedContentRecord, ContentFilters } from '../../database/dal';

/**
 * Setup IPC handlers for generated_content table operations
 */
export function setupGeneratedContentHandlers(appDataPath?: string): void {
  // Create generated content
  ipcMain.handle('ipc:content:create', async (_, data: Omit<GeneratedContentRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      validateInput(data, ['lead_id', 'touchpoint_number', 'content_type']);
      console.log(`💾 [IPC] Creating content for lead ID: ${data.lead_id}`, {
        lead_id: data.lead_id,
        touchpoint_number: data.touchpoint_number,
        content_type: data.content_type,
        status: data.status,
        contentLength: data.content?.length || 0
      });
      const result = GeneratedContentDAL.create(data);
      console.log(`✅ [IPC] Content created successfully:`, {
        id: result.id,
        lead_id: result.lead_id
      });
      return result;
    } catch (error) {
      console.error(`❌ [IPC] Error creating content:`, error);
      return handleIpcError(error, 'content:create');
    }
  });

  // Get content by lead ID
  ipcMain.handle('ipc:content:getByLead', async (_, leadId: number) => {
    try {
      validateInput({ leadId }, ['leadId']);
      console.log(`🔍 [IPC] Getting content for lead ID: ${leadId}`);
      const result = GeneratedContentDAL.getByLead(leadId);
      console.log(`🔍 [IPC] Query result for lead ${leadId}:`, {
        found: result.length,
        data: result
      });
      return result;
    } catch (error) {
      console.error(`❌ [IPC] Error getting content for lead ${leadId}:`, error);
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
