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
  ipcMain.handle('ipc:leads:bulkCreate', async (_, leads: BulkLeadData[]) => {
    try {
      validateInput({ leads }, ['leads']);
      if (!Array.isArray(leads) || leads.length === 0) {
        throw new Error('Leads array is required and must not be empty');
      }
      return LeadsDAL.bulkCreate(leads);
    } catch (error) {
      return handleIpcError(error, 'leads:bulkCreate');
    }
  });

  // Get all leads
  ipcMain.handle('ipc:leads:getAll', async (_, options?: LeadFilters) => {
    try {
      return LeadsDAL.getAll(options);
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
      return LeadsDAL.update(id, data);
    } catch (error) {
      return handleIpcError(error, 'leads:update');
    }
  });

  // Delete lead
  ipcMain.handle('ipc:leads:delete', async (_, id: number) => {
    try {
      validateInput({ id }, ['id']);
      return LeadsDAL.delete(id);
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

  console.log('Leads IPC handlers setup complete');
}
