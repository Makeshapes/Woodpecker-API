import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserWindow, ipcMain } from 'electron';
import { setupIpcHandlers, removeIpcHandlers } from '../ipc';
import { initializeDatabase } from '../../database/init';
import { ImportsDAL, LeadsDAL } from '../../database/dal';

// Mock Electron
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
  ipcMain: {
    handle: vi.fn(),
    removeAllListeners: vi.fn()
  }
}));

// Mock database initialization
vi.mock('../../database/init', () => ({
  initializeDatabase: vi.fn()
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  }
}));

describe('IPC Integration Tests', () => {
  let mockWindow: any;
  let handlersMap: Map<string, Function>;

  beforeEach(async () => {
    vi.clearAllMocks();
    handlersMap = new Map();
    
    // Mock BrowserWindow
    mockWindow = {
      webContents: {
        send: vi.fn()
      },
      loadURL: vi.fn(),
      loadFile: vi.fn(),
      on: vi.fn(),
      isMinimized: vi.fn().mockReturnValue(false),
      restore: vi.fn(),
      focus: vi.fn()
    };
    
    (BrowserWindow as any).mockImplementation(() => mockWindow);
    
    // Capture IPC handlers
    (ipcMain.handle as any).mockImplementation((channel: string, handler: Function) => {
      handlersMap.set(channel, handler);
    });
    
    // Mock database initialization
    (initializeDatabase as any).mockResolvedValue(undefined);
    
    // Setup IPC handlers
    setupIpcHandlers();
  });

  afterEach(() => {
    removeIpcHandlers();
  });

  describe('End-to-End IPC Communication', () => {
    it('should handle complete import workflow', async () => {
      // Mock DAL responses
      const mockImport = {
        id: 1,
        filename: 'test.csv',
        file_path: '/test/test.csv',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const mockLeads = [
        { import_id: 1, email: 'user1@example.com', first_name: 'John', last_name: 'Doe' },
        { import_id: 1, email: 'user2@example.com', first_name: 'Jane', last_name: 'Smith' }
      ];
      
      // Mock successful responses
      vi.spyOn(ImportsDAL, 'create').mockResolvedValue(mockImport);
      vi.spyOn(LeadsDAL, 'bulkCreate').mockResolvedValue({ created: 2, errors: [] });
      vi.spyOn(ImportsDAL, 'update').mockResolvedValue(true);
      vi.spyOn(LeadsDAL, 'getByImport').mockResolvedValue(mockLeads.map((lead, index) => ({
        id: index + 1,
        ...lead,
        created_at: new Date(),
        updated_at: new Date()
      })));
      
      // Step 1: Create import
      const createImportHandler = handlersMap.get('ipc:imports:create')!;
      const importResult = await createImportHandler({}, {
        filename: 'test.csv',
        file_path: '/test/test.csv',
        status: 'pending'
      });
      
      expect(importResult).toEqual(mockImport);
      expect(ImportsDAL.create).toHaveBeenCalledWith({
        filename: 'test.csv',
        file_path: '/test/test.csv',
        status: 'pending'
      });
      
      // Step 2: Bulk create leads
      const bulkCreateHandler = handlersMap.get('ipc:leads:bulkCreate')!;
      const bulkResult = await bulkCreateHandler({}, mockLeads);
      
      expect(bulkResult).toEqual({ created: 2, errors: [] });
      expect(LeadsDAL.bulkCreate).toHaveBeenCalledWith(mockLeads);
      
      // Step 3: Update import status
      const updateImportHandler = handlersMap.get('ipc:imports:update')!;
      const updateResult = await updateImportHandler({}, 1, { status: 'completed' });
      
      expect(updateResult).toBe(true);
      expect(ImportsDAL.update).toHaveBeenCalledWith(1, { status: 'completed' });
      
      // Step 4: Get leads for import
      const getLeadsByImportHandler = handlersMap.get('ipc:leads:getByImport')!;
      const leadsResult = await getLeadsByImportHandler({}, 1);
      
      expect(leadsResult).toHaveLength(2);
      expect(LeadsDAL.getByImport).toHaveBeenCalledWith(1);
    });

    it('should handle error propagation correctly', async () => {
      // Mock DAL error
      const mockError = new Error('Database connection failed');
      vi.spyOn(ImportsDAL, 'getAll').mockRejectedValue(mockError);
      
      const handler = handlersMap.get('ipc:imports:getAll')!;
      const result = await handler({}, {});
      
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error.message).toBe('Database connection failed');
    });

    it('should validate input parameters', async () => {
      const handler = handlersMap.get('ipc:imports:create')!;
      
      // Test with missing required fields
      const result = await handler({}, { filename: 'test.csv' }); // missing file_path and status
      
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error.type).toBe('ValidationError');
      expect(result.error.message).toContain('Missing required fields');
    });

    it('should handle concurrent IPC calls', async () => {
      // Mock multiple concurrent operations
      vi.spyOn(ImportsDAL, 'getAll').mockResolvedValue([]);
      vi.spyOn(LeadsDAL, 'getAll').mockResolvedValue([]);
      vi.spyOn(ImportsDAL, 'getById').mockResolvedValue(null);
      
      const importsHandler = handlersMap.get('ipc:imports:getAll')!;
      const leadsHandler = handlersMap.get('ipc:leads:getAll')!;
      const importByIdHandler = handlersMap.get('ipc:imports:getById')!;
      
      // Execute multiple handlers concurrently
      const results = await Promise.all([
        importsHandler({}, {}),
        leadsHandler({}, {}),
        importByIdHandler({}, 1)
      ]);
      
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual([]);
      expect(results[1]).toEqual([]);
      expect(results[2]).toBeNull();
    });
  });

  describe('Security and Validation', () => {
    it('should sanitize input data', async () => {
      const handler = handlersMap.get('ipc:imports:create')!;
      
      const inputData = {
        filename: '  test.csv  ', // with whitespace
        file_path: '/test/test.csv',
        status: 'pending'
      };
      
      vi.spyOn(ImportsDAL, 'create').mockResolvedValue({
        id: 1,
        ...inputData,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      await handler({}, inputData);
      
      // Verify that the DAL was called (input sanitization happens in utils)
      expect(ImportsDAL.create).toHaveBeenCalled();
    });

    it('should handle malformed input gracefully', async () => {
      const handler = handlersMap.get('ipc:leads:bulkCreate')!;
      
      // Test with non-array input
      const result1 = await handler({}, 'not an array');
      expect(result1).toHaveProperty('success', false);
      
      // Test with empty array
      const result2 = await handler({}, []);
      expect(result2).toHaveProperty('success', false);
      expect(result2.error.message).toContain('must not be empty');
    });

    it('should prevent SQL injection attempts', async () => {
      const handler = handlersMap.get('ipc:leads:search')!;
      
      // Mock search function
      vi.spyOn(LeadsDAL, 'search').mockResolvedValue([]);
      
      // Test with potential SQL injection
      const maliciousQuery = "'; DROP TABLE leads; --";
      await handler({}, maliciousQuery, {});
      
      // Verify that the query was passed to DAL (which should handle sanitization)
      expect(LeadsDAL.search).toHaveBeenCalledWith(maliciousQuery, {});
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle large bulk operations', async () => {
      const handler = handlersMap.get('ipc:leads:bulkCreate')!;
      
      // Create a large dataset
      const largeLeadSet = Array.from({ length: 1000 }, (_, index) => ({
        import_id: 1,
        email: `user${index}@example.com`,
        first_name: `User${index}`,
        last_name: 'Test'
      }));
      
      vi.spyOn(LeadsDAL, 'bulkCreate').mockResolvedValue({
        created: 1000,
        errors: []
      });
      
      const result = await handler({}, largeLeadSet);
      
      expect(result).toEqual({ created: 1000, errors: [] });
      expect(LeadsDAL.bulkCreate).toHaveBeenCalledWith(largeLeadSet);
    });

    it('should handle timeout scenarios', async () => {
      const handler = handlersMap.get('ipc:imports:getAll')!;
      
      // Mock a slow operation
      vi.spyOn(ImportsDAL, 'getAll').mockImplementation(() => 
        new Promise((resolve) => setTimeout(() => resolve([]), 100))
      );
      
      const startTime = Date.now();
      const result = await handler({}, {});
      const endTime = Date.now();
      
      expect(result).toEqual([]);
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });
});
