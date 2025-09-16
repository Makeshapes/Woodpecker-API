import { ipcMain } from 'electron';
import { setupImportsHandlers } from './imports';
import { setupLeadsHandlers } from './leads';
import { setupGeneratedContentHandlers } from './generated-content';
import { setupMappingsHandlers } from './mappings';
import { setupAppMetadataHandlers } from './app-metadata';
import { setupAdvancedQueriesHandlers } from './advanced-queries';
import { setupClaudeHandlers } from './claudeHandlers';
import { setupWoodpeckerHandlers } from './woodpeckerHandlers';

/**
 * Setup all IPC handlers for database operations
 */
export function setupIpcHandlers(appDataPath: string): void {
  console.log('Setting up IPC handlers...');
  
  try {
    // Setup handlers for each table
    setupImportsHandlers(appDataPath);
    setupLeadsHandlers(appDataPath);
    setupGeneratedContentHandlers(appDataPath);
    setupMappingsHandlers(appDataPath);
    setupAppMetadataHandlers(appDataPath);
    setupAdvancedQueriesHandlers(appDataPath);

    // Setup Claude API handlers
    setupClaudeHandlers();

    // Setup Woodpecker API handlers
    setupWoodpeckerHandlers();

    console.log('All IPC handlers setup successfully');
  } catch (error) {
    console.error('Failed to setup IPC handlers:', error);
    throw error;
  }
}

/**
 * Remove all IPC handlers (useful for cleanup)
 */
export function removeIpcHandlers(): void {
  console.log('Removing IPC handlers...');
  
  // Remove all listeners
  ipcMain.removeAllListeners();
  
  console.log('All IPC handlers removed');
}
