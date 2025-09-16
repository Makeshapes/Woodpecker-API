import { ipcMain } from 'electron';
import { AdvancedQueriesDAL } from '../../database/dal';
import { handleIpcError, validateInput } from './utils';
import type { SearchFilters } from '../../database/dal';

/**
 * Setup IPC handlers for advanced query operations
 */
export function setupAdvancedQueriesHandlers(): void {
  // Get leads with generated content
  ipcMain.handle('ipc:queries:getLeadsWithContent', async (_, options?: SearchFilters) => {
    try {
      return AdvancedQueriesDAL.getLeadsWithContent(options);
    } catch (error) {
      return handleIpcError(error, 'queries:getLeadsWithContent');
    }
  });

  // Get import summary
  ipcMain.handle('ipc:queries:getImportSummary', async (_, importId?: number) => {
    try {
      return AdvancedQueriesDAL.getImportSummary(importId);
    } catch (error) {
      return handleIpcError(error, 'queries:getImportSummary');
    }
  });

  // Get content generation stats
  ipcMain.handle('ipc:queries:getContentStats', async (_) => {
    try {
      return AdvancedQueriesDAL.getContentStats();
    } catch (error) {
      return handleIpcError(error, 'queries:getContentStats');
    }
  });

  // Export data
  ipcMain.handle('ipc:queries:exportData', async (_, format: string, options?: any) => {
    try {
      validateInput({ format }, ['format']);
      return AdvancedQueriesDAL.exportData(format, options);
    } catch (error) {
      return handleIpcError(error, 'queries:exportData');
    }
  });

  console.log('Advanced Queries IPC handlers setup complete');
}
