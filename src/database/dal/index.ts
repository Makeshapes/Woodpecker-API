// Main DAL exports
export { ImportsDAL } from './imports';
export { LeadsDAL } from './leads';
export { GeneratedContentDAL } from './generated_content';
export { MappingsDAL } from './mappings';
export { AppMetadataDAL } from './app_metadata';
export { AdvancedQueriesDAL } from './queries';

// Type exports
export type { ImportRecord, ImportFilters } from './imports';
export type { LeadRecord, LeadFilters, BulkLeadData } from './leads';
export type { GeneratedContentRecord, ContentFilters } from './generated_content';
export type { MappingRecord, MappingFilters, BulkMappingData } from './mappings';
export type { AppMetadataRecord, MetadataFilters } from './app_metadata';
export type {
  ImportWithStats,
  LeadWithContent,
  LeadWithImport,
  ContentWithLead,
  SearchFilters,
  ReportingStats
} from './queries';

// Error exports
export {
  DALError,
  ValidationError,
  NotFoundError,
  ForeignKeyError,
  UniqueConstraintError,
  TransactionError,
  handleDatabaseError
} from './errors';

// Common types
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

// Utility functions for common operations
import { withDatabase, withTransaction } from '../utils';
import { ImportsDAL } from './imports';
import { LeadsDAL } from './leads';
import { MappingsDAL } from './mappings';
import { GeneratedContentDAL } from './generated_content';
import { handleDatabaseError } from './errors';

export class DALUtils {
  /**
   * Delete an import and all related data (cascade delete)
   */
  static deleteImportCascade(importId: number): boolean {
    try {
      return withTransaction(db => {
        // Delete generated content for all leads in this import
        const leads = LeadsDAL.getByImport(importId);
        for (const lead of leads) {
          if (lead.id) {
            GeneratedContentDAL.deleteByLead(lead.id);
          }
        }
        
        // Delete leads
        LeadsDAL.deleteByImport(importId);
        
        // Delete mappings
        MappingsDAL.deleteByImport(importId);
        
        // Delete import
        return ImportsDAL.delete(importId);
      });
    } catch (error) {
      handleDatabaseError(error, 'deleteImportCascade', 'imports');
    }
  }
  
  /**
   * Get database health status
   */
  static getHealthStatus(): {
    healthy: boolean;
    tables: Record<string, { exists: boolean; count: number }>;
    error?: string;
  } {
    try {
      return withDatabase(db => {
        const tables = ['imports', 'leads', 'generated_content', 'mappings', 'app_metadata'];
        const tableStatus: Record<string, { exists: boolean; count: number }> = {};
        
        for (const table of tables) {
          try {
            const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
            tableStatus[table] = { exists: true, count: result.count };
          } catch (error) {
            tableStatus[table] = { exists: false, count: 0 };
          }
        }
        
        const allTablesExist = Object.values(tableStatus).every(status => status.exists);
        
        return {
          healthy: allTablesExist,
          tables: tableStatus
        };
      });
    } catch (error) {
      return {
        healthy: false,
        tables: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Validate foreign key relationships
   */
  static validateForeignKeys(): {
    valid: boolean;
    errors: string[];
  } {
    try {
      return withDatabase(db => {
        const errors: string[] = [];
        
        // Check leads -> imports
        const orphanedLeads = db.prepare(`
          SELECT COUNT(*) as count 
          FROM leads l 
          LEFT JOIN imports i ON l.import_id = i.id 
          WHERE i.id IS NULL
        `).get() as { count: number };
        
        if (orphanedLeads.count > 0) {
          errors.push(`${orphanedLeads.count} leads have invalid import_id references`);
        }
        
        // Check generated_content -> leads
        const orphanedContent = db.prepare(`
          SELECT COUNT(*) as count 
          FROM generated_content gc 
          LEFT JOIN leads l ON gc.lead_id = l.id 
          WHERE l.id IS NULL
        `).get() as { count: number };
        
        if (orphanedContent.count > 0) {
          errors.push(`${orphanedContent.count} generated_content records have invalid lead_id references`);
        }
        
        // Check mappings -> imports
        const orphanedMappings = db.prepare(`
          SELECT COUNT(*) as count 
          FROM mappings m 
          LEFT JOIN imports i ON m.import_id = i.id 
          WHERE i.id IS NULL
        `).get() as { count: number };
        
        if (orphanedMappings.count > 0) {
          errors.push(`${orphanedMappings.count} mappings have invalid import_id references`);
        }
        
        return {
          valid: errors.length === 0,
          errors
        };
      });
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
  
  /**
   * Clean up orphaned records
   */
  static cleanupOrphanedRecords(): {
    cleaned: number;
    details: Record<string, number>;
  } {
    try {
      return withTransaction(db => {
        const details: Record<string, number> = {};
        
        // Clean orphaned generated_content
        const contentResult = db.prepare(`
          DELETE FROM generated_content 
          WHERE lead_id NOT IN (SELECT id FROM leads)
        `).run();
        details.generated_content = contentResult.changes;
        
        // Clean orphaned leads
        const leadsResult = db.prepare(`
          DELETE FROM leads 
          WHERE import_id NOT IN (SELECT id FROM imports)
        `).run();
        details.leads = leadsResult.changes;
        
        // Clean orphaned mappings
        const mappingsResult = db.prepare(`
          DELETE FROM mappings 
          WHERE import_id NOT IN (SELECT id FROM imports)
        `).run();
        details.mappings = mappingsResult.changes;
        
        const totalCleaned = Object.values(details).reduce((sum, count) => sum + count, 0);
        
        return {
          cleaned: totalCleaned,
          details
        };
      });
    } catch (error) {
      handleDatabaseError(error, 'cleanupOrphanedRecords', 'multiple');
    }
  }
}
