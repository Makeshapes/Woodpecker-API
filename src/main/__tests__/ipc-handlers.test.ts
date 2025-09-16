import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain } from 'electron';
import { setupIpcHandlers, removeIpcHandlers } from '../ipc';
import * as DAL from '../../database/dal';

// Mock Electron's ipcMain
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeAllListeners: vi.fn()
  }
}));

// Mock the DAL modules
vi.mock('../../database/dal', () => ({
  ImportsDAL: {
    create: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  LeadsDAL: {
    create: vi.fn(),
    bulkCreate: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
    getByImport: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    search: vi.fn()
  },
  GeneratedContentDAL: {
    create: vi.fn(),
    getByLead: vi.fn(),
    getByTouchpoint: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  MappingsDAL: {
    create: vi.fn(),
    getByImport: vi.fn(),
    getActive: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  AppMetadataDAL: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn()
  },
  AdvancedQueriesDAL: {
    getLeadsWithContent: vi.fn(),
    getImportSummary: vi.fn(),
    getContentStats: vi.fn(),
    exportData: vi.fn()
  }
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

describe('IPC Handlers', () => {
  const mockIpcMain = ipcMain as any;
  let handlersMap: Map<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    handlersMap = new Map();
    
    // Capture all registered handlers
    mockIpcMain.handle.mockImplementation((channel: string, handler: Function) => {
      handlersMap.set(channel, handler);
    });
    
    setupIpcHandlers();
  });

  afterEach(() => {
    removeIpcHandlers();
  });

  describe('Imports Handlers', () => {
    it('should register imports:create handler', () => {
      expect(handlersMap.has('ipc:imports:create')).toBe(true);
    });

    it('should handle imports:create successfully', async () => {
      const mockImport = { filename: 'test.csv', file_path: '/test', status: 'pending' };
      const mockResult = { id: 1, ...mockImport, created_at: new Date(), updated_at: new Date() };
      
      (DAL.ImportsDAL.create as any).mockResolvedValue(mockResult);
      
      const handler = handlersMap.get('ipc:imports:create')!;
      const result = await handler({}, mockImport);
      
      expect(DAL.ImportsDAL.create).toHaveBeenCalledWith(mockImport);
      expect(result).toEqual(mockResult);
    });

    it('should handle imports:getAll', async () => {
      const mockImports = [{ id: 1, filename: 'test.csv' }];
      (DAL.ImportsDAL.getAll as any).mockResolvedValue(mockImports);
      
      const handler = handlersMap.get('ipc:imports:getAll')!;
      const result = await handler({}, {});
      
      expect(DAL.ImportsDAL.getAll).toHaveBeenCalled();
      expect(result).toEqual(mockImports);
    });

    it('should handle imports:getById', async () => {
      const mockImport = { id: 1, filename: 'test.csv' };
      (DAL.ImportsDAL.getById as any).mockResolvedValue(mockImport);
      
      const handler = handlersMap.get('ipc:imports:getById')!;
      const result = await handler({}, 1);
      
      expect(DAL.ImportsDAL.getById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockImport);
    });
  });

  describe('Leads Handlers', () => {
    it('should register leads:create handler', () => {
      expect(handlersMap.has('ipc:leads:create')).toBe(true);
    });

    it('should handle leads:bulkCreate', async () => {
      const mockLeads = [{ import_id: 1, email: 'test@example.com' }];
      const mockResult = { created: 1, errors: [] };
      
      (DAL.LeadsDAL.bulkCreate as any).mockResolvedValue(mockResult);
      
      const handler = handlersMap.get('ipc:leads:bulkCreate')!;
      const result = await handler({}, mockLeads);
      
      expect(DAL.LeadsDAL.bulkCreate).toHaveBeenCalledWith(mockLeads);
      expect(result).toEqual(mockResult);
    });

    it('should handle leads:search', async () => {
      const mockLeads = [{ id: 1, email: 'test@example.com' }];
      (DAL.LeadsDAL.search as any).mockResolvedValue(mockLeads);
      
      const handler = handlersMap.get('ipc:leads:search')!;
      const result = await handler({}, 'test', {});
      
      expect(DAL.LeadsDAL.search).toHaveBeenCalledWith('test', {});
      expect(result).toEqual(mockLeads);
    });
  });

  describe('Generated Content Handlers', () => {
    it('should register content:create handler', () => {
      expect(handlersMap.has('ipc:content:create')).toBe(true);
    });

    it('should handle content:getByLead', async () => {
      const mockContent = [{ id: 1, lead_id: 1, content_type: 'email' }];
      (DAL.GeneratedContentDAL.getByLead as any).mockResolvedValue(mockContent);
      
      const handler = handlersMap.get('ipc:content:getByLead')!;
      const result = await handler({}, 1);
      
      expect(DAL.GeneratedContentDAL.getByLead).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockContent);
    });
  });

  describe('Mappings Handlers', () => {
    it('should register mappings:create handler', () => {
      expect(handlersMap.has('ipc:mappings:create')).toBe(true);
    });

    it('should handle mappings:getActive', async () => {
      const mockMappings = [{ id: 1, source_field: 'email', target_field: 'email' }];
      (DAL.MappingsDAL.getActive as any).mockResolvedValue(mockMappings);
      
      const handler = handlersMap.get('ipc:mappings:getActive')!;
      const result = await handler({}, {});
      
      expect(DAL.MappingsDAL.getActive).toHaveBeenCalled();
      expect(result).toEqual(mockMappings);
    });
  });

  describe('App Metadata Handlers', () => {
    it('should register metadata:get handler', () => {
      expect(handlersMap.has('ipc:metadata:get')).toBe(true);
    });

    it('should handle metadata:set', async () => {
      (DAL.AppMetadataDAL.set as any).mockResolvedValue(true);
      
      const handler = handlersMap.get('ipc:metadata:set')!;
      const result = await handler({}, 'test_key', 'test_value');
      
      expect(DAL.AppMetadataDAL.set).toHaveBeenCalledWith('test_key', 'test_value');
      expect(result).toBe(true);
    });
  });

  describe('Advanced Queries Handlers', () => {
    it('should register queries:getLeadsWithContent handler', () => {
      expect(handlersMap.has('ipc:queries:getLeadsWithContent')).toBe(true);
    });

    it('should handle queries:getImportSummary', async () => {
      const mockSummary = { total_leads: 100, processed: 50 };
      (DAL.AdvancedQueriesDAL.getImportSummary as any).mockResolvedValue(mockSummary);
      
      const handler = handlersMap.get('ipc:queries:getImportSummary')!;
      const result = await handler({}, 1);
      
      expect(DAL.AdvancedQueriesDAL.getImportSummary).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockSummary);
    });

    it('should handle queries:exportData', async () => {
      const mockExport = { format: 'csv', data: 'test,data' };
      (DAL.AdvancedQueriesDAL.exportData as any).mockResolvedValue(mockExport);
      
      const handler = handlersMap.get('ipc:queries:exportData')!;
      const result = await handler({}, 'csv', {});
      
      expect(DAL.AdvancedQueriesDAL.exportData).toHaveBeenCalledWith('csv', {});
      expect(result).toEqual(mockExport);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const handler = handlersMap.get('ipc:imports:create')!;
      
      // Test with missing required fields
      const result = await handler({}, {});
      
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error.type).toBe('ValidationError');
    });

    it('should handle DAL errors', async () => {
      const mockError = new Error('Database connection failed');
      (DAL.ImportsDAL.getAll as any).mockRejectedValue(mockError);
      
      const handler = handlersMap.get('ipc:imports:getAll')!;
      const result = await handler({}, {});
      
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });
  });
});
