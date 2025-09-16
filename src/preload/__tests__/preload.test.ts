import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Electron modules
const mockIpcRenderer = {
  invoke: vi.fn()
};

const mockContextBridge = {
  exposeInMainWorld: vi.fn()
};

vi.mock('electron', () => ({
  ipcRenderer: mockIpcRenderer,
  contextBridge: mockContextBridge
}));

// Mock process for preload environment
Object.defineProperty(global, 'process', {
  value: {
    platform: 'darwin',
    versions: {
      node: '18.0.0',
      electron: '25.0.0'
    }
  }
});

describe('Preload Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should expose API to main world', async () => {
    // Import the preload script to trigger the contextBridge.exposeInMainWorld calls
    await import('../preload');
    
    // Verify that contextBridge.exposeInMainWorld was called
    expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith('api', expect.any(Object));
    expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith('electronUtils', expect.any(Object));
  });

  it('should expose correct API structure', async () => {
    await import('../preload');
    
    const apiCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
      call => call[0] === 'api'
    );
    
    expect(apiCall).toBeDefined();
    const api = apiCall![1];
    
    // Check that all expected API sections are present
    expect(api).toHaveProperty('imports');
    expect(api).toHaveProperty('leads');
    expect(api).toHaveProperty('content');
    expect(api).toHaveProperty('mappings');
    expect(api).toHaveProperty('metadata');
    expect(api).toHaveProperty('queries');
    
    // Check imports API methods
    expect(api.imports).toHaveProperty('create');
    expect(api.imports).toHaveProperty('getAll');
    expect(api.imports).toHaveProperty('getById');
    expect(api.imports).toHaveProperty('update');
    expect(api.imports).toHaveProperty('delete');
    
    // Check leads API methods
    expect(api.leads).toHaveProperty('create');
    expect(api.leads).toHaveProperty('bulkCreate');
    expect(api.leads).toHaveProperty('getAll');
    expect(api.leads).toHaveProperty('getById');
    expect(api.leads).toHaveProperty('getByImport');
    expect(api.leads).toHaveProperty('update');
    expect(api.leads).toHaveProperty('delete');
    expect(api.leads).toHaveProperty('search');
    
    // Check content API methods
    expect(api.content).toHaveProperty('create');
    expect(api.content).toHaveProperty('getByLead');
    expect(api.content).toHaveProperty('getByTouchpoint');
    expect(api.content).toHaveProperty('update');
    expect(api.content).toHaveProperty('delete');
    
    // Check mappings API methods
    expect(api.mappings).toHaveProperty('create');
    expect(api.mappings).toHaveProperty('getByImport');
    expect(api.mappings).toHaveProperty('getActive');
    expect(api.mappings).toHaveProperty('update');
    expect(api.mappings).toHaveProperty('delete');
    
    // Check metadata API methods
    expect(api.metadata).toHaveProperty('get');
    expect(api.metadata).toHaveProperty('set');
    expect(api.metadata).toHaveProperty('delete');
    expect(api.metadata).toHaveProperty('getAll');
    
    // Check queries API methods
    expect(api.queries).toHaveProperty('getLeadsWithContent');
    expect(api.queries).toHaveProperty('getImportSummary');
    expect(api.queries).toHaveProperty('getContentStats');
    expect(api.queries).toHaveProperty('exportData');
  });

  it('should expose electron utils', async () => {
    await import('../preload');
    
    const utilsCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
      call => call[0] === 'electronUtils'
    );
    
    expect(utilsCall).toBeDefined();
    const utils = utilsCall![1];
    
    expect(utils).toHaveProperty('platform');
    expect(utils).toHaveProperty('versions');
  });

  describe('API Method Calls', () => {
    let api: any;

    beforeEach(async () => {
      await import('../preload');
      
      const apiCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        call => call[0] === 'api'
      );
      api = apiCall![1];
    });

    it('should call correct IPC channels for imports', async () => {
      const mockData = { filename: 'test.csv', file_path: '/test', status: 'pending' };
      
      await api.imports.create(mockData);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:imports:create', mockData);
      
      await api.imports.getAll({ limit: 10 });
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:imports:getAll', { limit: 10 });
      
      await api.imports.getById(1);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:imports:getById', 1);
      
      await api.imports.update(1, { status: 'completed' });
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:imports:update', 1, { status: 'completed' });
      
      await api.imports.delete(1);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:imports:delete', 1);
    });

    it('should call correct IPC channels for leads', async () => {
      const mockLead = { import_id: 1, email: 'test@example.com' };
      const mockLeads = [mockLead];
      
      await api.leads.create(mockLead);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:leads:create', mockLead);
      
      await api.leads.bulkCreate(mockLeads);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:leads:bulkCreate', mockLeads);
      
      await api.leads.search('test', { limit: 10 });
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:leads:search', 'test', { limit: 10 });
      
      await api.leads.getByImport(1);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:leads:getByImport', 1);
    });

    it('should call correct IPC channels for content', async () => {
      const mockContent = { lead_id: 1, touchpoint_number: 1, content_type: 'email' };
      
      await api.content.create(mockContent);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:content:create', mockContent);
      
      await api.content.getByLead(1);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:content:getByLead', 1);
      
      await api.content.getByTouchpoint(1, {});
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:content:getByTouchpoint', 1, {});
    });

    it('should call correct IPC channels for mappings', async () => {
      const mockMapping = { import_id: 1, source_field: 'email', target_field: 'email' };
      
      await api.mappings.create(mockMapping);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:mappings:create', mockMapping);
      
      await api.mappings.getByImport(1);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:mappings:getByImport', 1);
      
      await api.mappings.getActive({});
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:mappings:getActive', {});
    });

    it('should call correct IPC channels for metadata', async () => {
      await api.metadata.get('test_key');
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:metadata:get', 'test_key');
      
      await api.metadata.set('test_key', 'test_value');
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:metadata:set', 'test_key', 'test_value');
      
      await api.metadata.delete('test_key');
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:metadata:delete', 'test_key');
      
      await api.metadata.getAll({});
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:metadata:getAll', {});
    });

    it('should call correct IPC channels for queries', async () => {
      await api.queries.getLeadsWithContent({});
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:queries:getLeadsWithContent', {});
      
      await api.queries.getImportSummary(1);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:queries:getImportSummary', 1);
      
      await api.queries.getContentStats();
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:queries:getContentStats');
      
      await api.queries.exportData('csv', {});
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('ipc:queries:exportData', 'csv', {});
    });
  });
});
