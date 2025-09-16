import Database from 'better-sqlite3';
import { withDatabase, withTransaction } from '../utils';

export interface MappingRecord {
  id?: number;
  import_id: number;
  csv_column: string;
  woodpecker_field: string;
  mapping_type?: 'direct' | 'computed' | 'default';
  is_active?: boolean;
  created_at?: string;
}

export interface MappingFilters {
  import_id?: number;
  csv_column?: string;
  woodpecker_field?: string;
  mapping_type?: MappingRecord['mapping_type'];
  is_active?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface BulkMappingData {
  import_id: number;
  mappings: Omit<MappingRecord, 'id' | 'import_id' | 'created_at'>[];
}

export class MappingsDAL {
  static create(mappingData: Omit<MappingRecord, 'id' | 'created_at'>): MappingRecord {
    return withDatabase(db => {
      const stmt = db.prepare(`
        INSERT INTO mappings (
          import_id, csv_column, woodpecker_field, mapping_type, is_active
        )
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        mappingData.import_id,
        mappingData.csv_column,
        mappingData.woodpecker_field,
        mappingData.mapping_type || 'direct',
        mappingData.is_active !== undefined ? mappingData.is_active : true
      );
      
      return this.getById(result.lastInsertRowid as number)!;
    });
  }

  static bulkCreate(bulkData: BulkMappingData): MappingRecord[] {
    return withTransaction(db => {
      const stmt = db.prepare(`
        INSERT INTO mappings (
          import_id, csv_column, woodpecker_field, mapping_type, is_active
        )
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const results: MappingRecord[] = [];
      
      for (const mapping of bulkData.mappings) {
        const result = stmt.run(
          bulkData.import_id,
          mapping.csv_column,
          mapping.woodpecker_field,
          mapping.mapping_type || 'direct',
          mapping.is_active !== undefined ? mapping.is_active : true
        );
        
        const created = this.getById(result.lastInsertRowid as number);
        if (created) results.push(created);
      }
      
      return results;
    });
  }

  static getById(id: number): MappingRecord | null {
    return withDatabase(db => {
      const stmt = db.prepare('SELECT * FROM mappings WHERE id = ?');
      return stmt.get(id) as MappingRecord | undefined || null;
    });
  }

  static getAll(filters?: MappingFilters, pagination?: PaginationOptions): MappingRecord[] {
    return withDatabase(db => {
      let query = 'SELECT * FROM mappings WHERE 1=1';
      const params: any[] = [];
      
      if (filters?.import_id) {
        query += ' AND import_id = ?';
        params.push(filters.import_id);
      }
      
      if (filters?.csv_column) {
        query += ' AND csv_column LIKE ?';
        params.push(`%${filters.csv_column}%`);
      }
      
      if (filters?.woodpecker_field) {
        query += ' AND woodpecker_field = ?';
        params.push(filters.woodpecker_field);
      }
      
      if (filters?.mapping_type) {
        query += ' AND mapping_type = ?';
        params.push(filters.mapping_type);
      }
      
      if (filters?.is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.is_active);
      }
      
      if (filters?.dateFrom) {
        query += ' AND created_at >= ?';
        params.push(filters.dateFrom);
      }
      
      if (filters?.dateTo) {
        query += ' AND created_at <= ?';
        params.push(filters.dateTo);
      }
      
      query += ' ORDER BY created_at DESC';
      
      if (pagination?.limit) {
        query += ' LIMIT ?';
        params.push(pagination.limit);
        
        if (pagination?.offset) {
          query += ' OFFSET ?';
          params.push(pagination.offset);
        }
      }
      
      const stmt = db.prepare(query);
      return stmt.all(...params) as MappingRecord[];
    });
  }

  static update(id: number, updates: Partial<Omit<MappingRecord, 'id' | 'created_at'>>): MappingRecord | null {
    return withDatabase(db => {
      const fields = Object.keys(updates).filter(key => updates[key as keyof typeof updates] !== undefined);
      if (fields.length === 0) return this.getById(id);
      
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => updates[field as keyof typeof updates]);
      
      const stmt = db.prepare(`UPDATE mappings SET ${setClause} WHERE id = ?`);
      const result = stmt.run(...values, id);
      
      return result.changes > 0 ? this.getById(id) : null;
    });
  }

  static updateActiveStatus(id: number, isActive: boolean): MappingRecord | null {
    return this.update(id, { is_active: isActive });
  }

  static updateMappingType(id: number, mappingType: MappingRecord['mapping_type']): MappingRecord | null {
    return this.update(id, { mapping_type: mappingType });
  }

  static bulkUpdateActiveStatus(ids: number[], isActive: boolean): number {
    return withTransaction(db => {
      const placeholders = ids.map(() => '?').join(',');
      const stmt = db.prepare(`UPDATE mappings SET is_active = ? WHERE id IN (${placeholders})`);
      const result = stmt.run(isActive, ...ids);
      return result.changes;
    });
  }

  static delete(id: number): boolean {
    return withTransaction(db => {
      const stmt = db.prepare('DELETE FROM mappings WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    });
  }

  static deleteByImport(importId: number): number {
    return withTransaction(db => {
      const stmt = db.prepare('DELETE FROM mappings WHERE import_id = ?');
      const result = stmt.run(importId);
      return result.changes;
    });
  }

  static deactivateByImport(importId: number): number {
    return withTransaction(db => {
      const stmt = db.prepare('UPDATE mappings SET is_active = 0 WHERE import_id = ?');
      const result = stmt.run(importId);
      return result.changes;
    });
  }

  static getCount(filters?: MappingFilters): number {
    return withDatabase(db => {
      let query = 'SELECT COUNT(*) as count FROM mappings WHERE 1=1';
      const params: any[] = [];
      
      if (filters?.import_id) {
        query += ' AND import_id = ?';
        params.push(filters.import_id);
      }
      
      if (filters?.csv_column) {
        query += ' AND csv_column LIKE ?';
        params.push(`%${filters.csv_column}%`);
      }
      
      if (filters?.woodpecker_field) {
        query += ' AND woodpecker_field = ?';
        params.push(filters.woodpecker_field);
      }
      
      if (filters?.mapping_type) {
        query += ' AND mapping_type = ?';
        params.push(filters.mapping_type);
      }
      
      if (filters?.is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.is_active);
      }
      
      if (filters?.dateFrom) {
        query += ' AND created_at >= ?';
        params.push(filters.dateFrom);
      }
      
      if (filters?.dateTo) {
        query += ' AND created_at <= ?';
        params.push(filters.dateTo);
      }
      
      const stmt = db.prepare(query);
      const result = stmt.get(...params) as { count: number };
      return result.count;
    });
  }

  static getByImport(importId: number, activeOnly: boolean = true): MappingRecord[] {
    const filters: MappingFilters = { import_id: importId };
    if (activeOnly) {
      filters.is_active = true;
    }
    return this.getAll(filters);
  }

  static getActiveMappings(importId?: number): MappingRecord[] {
    const filters: MappingFilters = { is_active: true };
    if (importId) {
      filters.import_id = importId;
    }
    return this.getAll(filters);
  }

  static getByMappingType(mappingType: MappingRecord['mapping_type'], pagination?: PaginationOptions): MappingRecord[] {
    return this.getAll({ mapping_type: mappingType }, pagination);
  }

  static getByWoodpeckerField(woodpeckerField: string): MappingRecord[] {
    return this.getAll({ woodpecker_field: woodpeckerField });
  }

  static searchByCsvColumn(csvColumn: string): MappingRecord[] {
    return this.getAll({ csv_column: csvColumn });
  }

  static getMappingConfiguration(importId: number): Record<string, string> {
    return withDatabase(db => {
      const stmt = db.prepare(`
        SELECT csv_column, woodpecker_field 
        FROM mappings 
        WHERE import_id = ? AND is_active = 1
      `);
      const results = stmt.all(importId) as { csv_column: string; woodpecker_field: string }[];
      
      return results.reduce((config, row) => {
        config[row.csv_column] = row.woodpecker_field;
        return config;
      }, {} as Record<string, string>);
    });
  }

  static getWoodpeckerFieldUsage(): Record<string, number> {
    return withDatabase(db => {
      const stmt = db.prepare(`
        SELECT woodpecker_field, COUNT(*) as usage_count 
        FROM mappings 
        WHERE is_active = 1 
        GROUP BY woodpecker_field 
        ORDER BY usage_count DESC
      `);
      const results = stmt.all() as { woodpecker_field: string; usage_count: number }[];
      
      return results.reduce((usage, row) => {
        usage[row.woodpecker_field] = row.usage_count;
        return usage;
      }, {} as Record<string, number>);
    });
  }

  static getMappingStats(): { total: number; active: number; byType: Record<string, number> } {
    return withDatabase(db => {
      const totalStmt = db.prepare('SELECT COUNT(*) as count FROM mappings');
      const total = (totalStmt.get() as { count: number }).count;
      
      const activeStmt = db.prepare('SELECT COUNT(*) as count FROM mappings WHERE is_active = 1');
      const active = (activeStmt.get() as { count: number }).count;
      
      const typeStmt = db.prepare('SELECT mapping_type, COUNT(*) as count FROM mappings GROUP BY mapping_type');
      const typeResults = typeStmt.all() as { mapping_type: string; count: number }[];
      const byType = typeResults.reduce((acc, row) => {
        acc[row.mapping_type] = row.count;
        return acc;
      }, {} as Record<string, number>);
      
      return { total, active, byType };
    });
  }

  static duplicateImportMappings(sourceImportId: number, targetImportId: number): MappingRecord[] {
    return withTransaction(db => {
      const sourceMappings = this.getByImport(sourceImportId, true);
      
      const bulkData: BulkMappingData = {
        import_id: targetImportId,
        mappings: sourceMappings.map(mapping => ({
          csv_column: mapping.csv_column,
          woodpecker_field: mapping.woodpecker_field,
          mapping_type: mapping.mapping_type,
          is_active: mapping.is_active
        }))
      };
      
      return this.bulkCreate(bulkData);
    });
  }

  static validateMappingConfiguration(importId: number): { valid: boolean; errors: string[] } {
    return withDatabase(db => {
      const mappings = this.getByImport(importId, true);
      const errors: string[] = [];
      
      if (mappings.length === 0) {
        errors.push('No active mappings found for import');
      }
      
      const csvColumns = new Set<string>();
      const woodpeckerFields = new Set<string>();
      
      for (const mapping of mappings) {
        if (csvColumns.has(mapping.csv_column)) {
          errors.push(`Duplicate CSV column mapping: ${mapping.csv_column}`);
        }
        csvColumns.add(mapping.csv_column);
        
        if (woodpeckerFields.has(mapping.woodpecker_field)) {
          errors.push(`Duplicate Woodpecker field mapping: ${mapping.woodpecker_field}`);
        }
        woodpeckerFields.add(mapping.woodpecker_field);
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    });
  }
}
