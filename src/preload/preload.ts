import { contextBridge, ipcRenderer } from 'electron';
import type { IpcResponse } from '../main/ipc/utils';
import type {
  ImportRecord,
  ImportFilters,
  LeadRecord,
  LeadFilters,
  BulkLeadData,
  GeneratedContentRecord,
  ContentFilters,
  MappingRecord,
  MappingFilters,
  AppMetadataRecord,
  MetadataFilters,
  SearchFilters
} from '../database/dal';
import type { ClaudeResponse } from '../main/services/claudeService';
import type { ClaudeGenerateContentRequest, ClaudeFileUploadRequest } from '../main/ipc/claudeHandlers';
import type { WoodpeckerCampaign, WoodpeckerProspect, WoodpeckerExportProgress } from '../main/services/woodpeckerService';
import type {
  WoodpeckerGetCampaignsRequest,
  WoodpeckerAddProspectsRequest,
  WoodpeckerCheckDuplicatesRequest
} from '../main/ipc/woodpeckerHandlers';

// Define the API interface that will be exposed to the renderer
export interface ElectronAPI {
  // Imports operations
  imports: {
    create: (data: Omit<ImportRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<IpcResponse<ImportRecord>>;
    getAll: (options?: ImportFilters) => Promise<IpcResponse<ImportRecord[]>>;
    getById: (id: number) => Promise<IpcResponse<ImportRecord | null>>;
    update: (id: number, data: Partial<ImportRecord>) => Promise<IpcResponse<boolean>>;
    delete: (id: number) => Promise<IpcResponse<boolean>>;
  };
  
  // Leads operations
  leads: {
    create: (data: Omit<LeadRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<IpcResponse<LeadRecord>>;
    bulkCreate: (leads: BulkLeadData[]) => Promise<IpcResponse<{ created: number; errors: any[] }>>;
    getAll: (options?: LeadFilters) => Promise<IpcResponse<LeadRecord[]>>;
    getById: (id: number) => Promise<IpcResponse<LeadRecord | null>>;
    getByImport: (importId: number) => Promise<IpcResponse<LeadRecord[]>>;
    update: (id: number, data: Partial<LeadRecord>) => Promise<IpcResponse<boolean>>;
    delete: (id: number) => Promise<IpcResponse<boolean>>;
    search: (query: string, options?: LeadFilters) => Promise<IpcResponse<LeadRecord[]>>;
  };
  
  // Generated content operations
  content: {
    create: (data: Omit<GeneratedContentRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<IpcResponse<GeneratedContentRecord>>;
    getByLead: (leadId: number) => Promise<IpcResponse<GeneratedContentRecord[]>>;
    getByTouchpoint: (touchpoint: number, options?: ContentFilters) => Promise<IpcResponse<GeneratedContentRecord[]>>;
    update: (id: number, data: Partial<GeneratedContentRecord>) => Promise<IpcResponse<boolean>>;
    delete: (id: number) => Promise<IpcResponse<boolean>>;
  };
  
  // Mappings operations
  mappings: {
    create: (data: Omit<MappingRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<IpcResponse<MappingRecord>>;
    getByImport: (importId: number) => Promise<IpcResponse<MappingRecord[]>>;
    getActive: (options?: MappingFilters) => Promise<IpcResponse<MappingRecord[]>>;
    update: (id: number, data: Partial<MappingRecord>) => Promise<IpcResponse<boolean>>;
    delete: (id: number) => Promise<IpcResponse<boolean>>;
  };
  
  // App metadata operations
  metadata: {
    get: (key: string) => Promise<IpcResponse<any>>;
    set: (key: string, value: any) => Promise<IpcResponse<boolean>>;
    delete: (key: string) => Promise<IpcResponse<boolean>>;
    getAll: (options?: MetadataFilters) => Promise<IpcResponse<AppMetadataRecord[]>>;
  };
  
  // Advanced queries
  queries: {
    getLeadsWithContent: (options?: SearchFilters) => Promise<IpcResponse<any[]>>;
    getImportSummary: (importId?: number) => Promise<IpcResponse<any>>;
    getContentStats: () => Promise<IpcResponse<any>>;
    exportData: (format: string, options?: any) => Promise<IpcResponse<any>>;
  };

  // Claude API operations
  claude: {
    generateContent: (request: ClaudeGenerateContentRequest) => Promise<IpcResponse<ClaudeResponse>>;
    uploadFile: (request: ClaudeFileUploadRequest) => Promise<IpcResponse<{ fileId: string }>>;
    deleteFile: (fileId: string) => Promise<IpcResponse<{ success: boolean }>>;
    getQuotaInfo: () => Promise<IpcResponse<{ requestCount: number; remainingRequests: number; maxRequestsPerMinute: number }>>;
  };

  // Woodpecker API operations
  woodpecker: {
    getCampaigns: (request?: WoodpeckerGetCampaignsRequest) => Promise<IpcResponse<WoodpeckerCampaign[]>>;
    addProspects: (request: WoodpeckerAddProspectsRequest) => Promise<IpcResponse<WoodpeckerExportProgress>>;
    checkDuplicates: (request: WoodpeckerCheckDuplicatesRequest) => Promise<IpcResponse<string[]>>;
    clearCache: () => Promise<IpcResponse<{ success: boolean }>>;
    getQuotaInfo: () => Promise<IpcResponse<{ requestCount: number; remainingRequests: number; maxRequestsPerMinute: number }>>;
  };

  // Database utility operations
  database: {
    clear: () => Promise<IpcResponse<{ success: boolean }>>;
  };

  // Settings operations
  settings: {
    getApiKeysStatus: () => Promise<{
      claude: boolean;
      woodpecker: boolean;
      claudeKeyMasked: string | null;
      woodpeckerKeyMasked: string | null;
    }>;
    updateApiKeys: (keys: {
      claudeApiKey?: string;
      woodpeckerApiKey?: string;
    }) => Promise<{ success: boolean }>;
    validateClaudeKey: (apiKey: string) => Promise<{ valid: boolean; error?: string }>;
    validateWoodpeckerKey: (apiKey: string) => Promise<{ valid: boolean; error?: string }>;
    getSettingsPath: () => Promise<string>;
    exportDatabase: () => Promise<{ success: boolean; filePath?: string; size?: number; canceled?: boolean }>;
    importDatabase: () => Promise<{ success: boolean; filePath?: string; backupPath?: string; size?: number; canceled?: boolean }>;
    getDatabaseInfo: () => Promise<{
      exists: boolean;
      path?: string;
      size?: number;
      modified?: Date;
      records?: { leads: number; imports: number; content: number };
      error?: string;
    }>;
  };
}

// Create the API object with all database operations
const electronAPI: ElectronAPI = {
  imports: {
    create: (data) => ipcRenderer.invoke('ipc:imports:create', data),
    getAll: (options) => ipcRenderer.invoke('ipc:imports:getAll', options),
    getById: (id) => ipcRenderer.invoke('ipc:imports:getById', id),
    update: (id, data) => ipcRenderer.invoke('ipc:imports:update', id, data),
    delete: (id) => ipcRenderer.invoke('ipc:imports:delete', id),
  },
  
  leads: {
    create: (data) => ipcRenderer.invoke('ipc:leads:create', data),
    bulkCreate: (leads) => ipcRenderer.invoke('ipc:leads:bulkCreate', leads),
    getAll: (options) => ipcRenderer.invoke('ipc:leads:getAll', options),
    getById: (id) => ipcRenderer.invoke('ipc:leads:getById', id),
    getByImport: (importId) => ipcRenderer.invoke('ipc:leads:getByImport', importId),
    update: (id, data) => ipcRenderer.invoke('ipc:leads:update', id, data),
    delete: (id) => ipcRenderer.invoke('ipc:leads:delete', id),
    search: (query, options) => ipcRenderer.invoke('ipc:leads:search', query, options),
  },
  
  content: {
    create: (data) => ipcRenderer.invoke('ipc:content:create', data),
    getByLead: (leadId) => ipcRenderer.invoke('ipc:content:getByLead', leadId),
    getByTouchpoint: (touchpoint, options) => ipcRenderer.invoke('ipc:content:getByTouchpoint', touchpoint, options),
    update: (id, data) => ipcRenderer.invoke('ipc:content:update', id, data),
    delete: (id) => ipcRenderer.invoke('ipc:content:delete', id),
  },
  
  mappings: {
    create: (data) => ipcRenderer.invoke('ipc:mappings:create', data),
    getByImport: (importId) => ipcRenderer.invoke('ipc:mappings:getByImport', importId),
    getActive: (options) => ipcRenderer.invoke('ipc:mappings:getActive', options),
    update: (id, data) => ipcRenderer.invoke('ipc:mappings:update', id, data),
    delete: (id) => ipcRenderer.invoke('ipc:mappings:delete', id),
  },
  
  metadata: {
    get: (key) => ipcRenderer.invoke('ipc:metadata:get', key),
    set: (key, value) => ipcRenderer.invoke('ipc:metadata:set', key, value),
    delete: (key) => ipcRenderer.invoke('ipc:metadata:delete', key),
    getAll: (options) => ipcRenderer.invoke('ipc:metadata:getAll', options),
  },
  
  queries: {
    getLeadsWithContent: (options) => ipcRenderer.invoke('ipc:queries:getLeadsWithContent', options),
    getImportSummary: (importId) => ipcRenderer.invoke('ipc:queries:getImportSummary', importId),
    getContentStats: () => ipcRenderer.invoke('ipc:queries:getContentStats'),
    exportData: (format, options) => ipcRenderer.invoke('ipc:queries:exportData', format, options),
  },

  claude: {
    generateContent: (request) => ipcRenderer.invoke('ipc:claude:generateContent', request),
    uploadFile: (request) => ipcRenderer.invoke('ipc:claude:uploadFile', request),
    deleteFile: (fileId) => ipcRenderer.invoke('ipc:claude:deleteFile', fileId),
    getQuotaInfo: () => ipcRenderer.invoke('ipc:claude:getQuotaInfo'),
  },

  woodpecker: {
    getCampaigns: async (request) => {
      try {
        console.log('🔌 [PRELOAD] Calling ipc:woodpecker:getCampaigns with request:', request);
        const result = await ipcRenderer.invoke('ipc:woodpecker:getCampaigns', request);
        console.log('🔌 [PRELOAD] getCampaigns result:', result);
        return result;
      } catch (error) {
        console.error('🔌 [PRELOAD] getCampaigns error:', error);
        throw error;
      }
    },
    addProspects: async (request) => {
      try {
        console.log('🔌 [PRELOAD] Calling ipc:woodpecker:addProspects');
        const result = await ipcRenderer.invoke('ipc:woodpecker:addProspects', request);
        console.log('🔌 [PRELOAD] addProspects result:', result);
        return result;
      } catch (error) {
        console.error('🔌 [PRELOAD] addProspects error:', error);
        throw error;
      }
    },
    checkDuplicates: async (request) => {
      try {
        console.log('🔌 [PRELOAD] Calling ipc:woodpecker:checkDuplicates');
        const result = await ipcRenderer.invoke('ipc:woodpecker:checkDuplicates', request);
        console.log('🔌 [PRELOAD] checkDuplicates result:', result);
        return result;
      } catch (error) {
        console.error('🔌 [PRELOAD] checkDuplicates error:', error);
        throw error;
      }
    },
    clearCache: async () => {
      try {
        console.log('🔌 [PRELOAD] Calling ipc:woodpecker:clearCache');
        const result = await ipcRenderer.invoke('ipc:woodpecker:clearCache');
        console.log('🔌 [PRELOAD] clearCache result:', result);
        return result;
      } catch (error) {
        console.error('🔌 [PRELOAD] clearCache error:', error);
        throw error;
      }
    },
    getQuotaInfo: async () => {
      try {
        console.log('🔌 [PRELOAD] Calling ipc:woodpecker:getQuotaInfo');
        const result = await ipcRenderer.invoke('ipc:woodpecker:getQuotaInfo');
        console.log('🔌 [PRELOAD] getQuotaInfo result:', result);
        return result;
      } catch (error) {
        console.error('🔌 [PRELOAD] getQuotaInfo error:', error);
        throw error;
      }
    },
  },

  database: {
    clear: () => ipcRenderer.invoke('ipc:database:clear'),
  },

  settings: {
    getApiKeysStatus: () => ipcRenderer.invoke('settings:getApiKeysStatus'),
    updateApiKeys: (keys) => ipcRenderer.invoke('settings:updateApiKeys', keys),
    validateClaudeKey: (apiKey) => ipcRenderer.invoke('settings:validateClaudeKey', apiKey),
    validateWoodpeckerKey: (apiKey) => ipcRenderer.invoke('settings:validateWoodpeckerKey', apiKey),
    getSettingsPath: () => ipcRenderer.invoke('settings:getSettingsPath'),
    exportDatabase: () => ipcRenderer.invoke('settings:exportDatabase'),
    importDatabase: () => ipcRenderer.invoke('settings:importDatabase'),
    getDatabaseInfo: () => ipcRenderer.invoke('settings:getDatabaseInfo'),
  },
};

// Log to confirm preload script is running
console.log('🚀 Preload script executing...');

// Expose the API to the renderer process through contextBridge
contextBridge.exposeInMainWorld('api', electronAPI);
console.log('✅ Exposed window.api');

// Debug: Test if specific APIs are accessible
try {
  if (electronAPI.woodpecker && electronAPI.woodpecker.getCampaigns) {
    console.log('✅ Woodpecker API is properly exposed');
  } else {
    console.error('❌ Woodpecker API not properly exposed');
  }

  if (electronAPI.settings && electronAPI.settings.getApiKeysStatus) {
    console.log('✅ Settings API is properly exposed');
  } else {
    console.error('❌ Settings API not properly exposed');
  }
} catch (error) {
  console.error('❌ Error checking API exposure:', error);
}

// Also expose some utility functions
contextBridge.exposeInMainWorld('electronUtils', {
  platform: process.platform,
  versions: process.versions,
});
console.log('✅ Exposed window.electronUtils');

// Type declaration for global window object (for TypeScript)
declare global {
  interface Window {
    api: ElectronAPI;
    electronUtils: {
      platform: string;
      versions: NodeJS.ProcessVersions;
    };
  }
}
