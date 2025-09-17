import { ipcMain } from 'electron';
import { LeadsDAL } from '../../database/dal';
import { handleIpcError, validateInput } from './utils';
import type { LeadRecord, LeadFilters, BulkLeadData } from '../../database/dal';

/**
 * Setup IPC handlers for leads table operations
 */
export function setupLeadsHandlers(): void {
  // Create lead
  ipcMain.handle('ipc:leads:create', async (_, data: Omit<LeadRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      validateInput(data, ['import_id', 'email']);
      return LeadsDAL.create(data);
    } catch (error) {
      return handleIpcError(error, 'leads:create');
    }
  });

  // Bulk create leads
  ipcMain.handle('ipc:leads:bulkCreate', async (_, bulkData: BulkLeadData) => {
    try {
      validateInput(bulkData, ['import_id']);
      if (!Array.isArray(bulkData.leads)) {
        throw new Error('Leads property must be an array');
      }
      if (bulkData.leads.length === 0) {
        // Return empty result for empty array instead of throwing error
        return { success: true, data: { created: [], skipped: 0 } };
      }
      const result = LeadsDAL.bulkCreate(bulkData);
      return { success: true, data: result };
    } catch (error) {
      return handleIpcError(error, 'leads:bulkCreate');
    }
  });

  // Get all leads
  ipcMain.handle('ipc:leads:getAll', async (_, options?: LeadFilters) => {
    try {
      const result = LeadsDAL.getAll(options);
      return { success: true, data: result };
    } catch (error) {
      return handleIpcError(error, 'leads:getAll');
    }
  });

  // Get lead by ID
  ipcMain.handle('ipc:leads:getById', async (_, id: number) => {
    try {
      validateInput({ id }, ['id']);
      return LeadsDAL.getById(id);
    } catch (error) {
      return handleIpcError(error, 'leads:getById');
    }
  });

  // Get leads by import ID
  ipcMain.handle('ipc:leads:getByImport', async (_, importId: number) => {
    try {
      validateInput({ importId }, ['importId']);
      return LeadsDAL.getByImport(importId);
    } catch (error) {
      return handleIpcError(error, 'leads:getByImport');
    }
  });

  // Update lead
  ipcMain.handle('ipc:leads:update', async (_, id: number, data: Partial<LeadRecord>) => {
    try {
      validateInput({ id }, ['id']);
      const result = LeadsDAL.update(id, data);
      return { success: true, data: result };
    } catch (error) {
      return handleIpcError(error, 'leads:update');
    }
  });

  // Delete lead
  ipcMain.handle('ipc:leads:delete', async (_, id: number) => {
    try {
      validateInput({ id }, ['id']);
      const result = LeadsDAL.delete(id);
      return { success: true, data: result };
    } catch (error) {
      return handleIpcError(error, 'leads:delete');
    }
  });

  // Search leads
  ipcMain.handle('ipc:leads:search', async (_, query: string, options?: LeadFilters) => {
    try {
      validateInput({ query }, ['query']);
      return LeadsDAL.search(query, options);
    } catch (error) {
      return handleIpcError(error, 'leads:search');
    }
  });

}
