import Database from 'better-sqlite3';
import { withDatabase, withTransaction } from '../utils';

export interface ImportRecord {
  id?: number;
  filename: string;
  import_date?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  lead_count?: number;
  error_messages?: string;
  created_at?: string;
}

export interface ImportFilters {
  status?: ImportRecord['status'];
  filename?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export class ImportsDAL {
  static create(importData: Omit<ImportRecord, 'id' | 'created_at'>): ImportRecord {
    return withDatabase(db => {
      const stmt = db.prepare(`
        INSERT INTO imports (filename, import_date, status, lead_count, error_messages)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        importData.filename,
        importData.import_date || new Date().toISOString(),
        importData.status,
        importData.lead_count || 0,
        importData.error_messages || null
      );
      
      return this.getById(result.lastInsertRowid as number)!;
    });
  }

  static getById(id: number): ImportRecord | null {
    return withDatabase(db => {
      const stmt = db.prepare('SELECT * FROM imports WHERE id = ?');
      return stmt.get(id) as ImportRecord | undefined || null;
    });
  }

  static getAll(filters?: ImportFilters, pagination?: PaginationOptions): ImportRecord[] {
    return withDatabase(db => {
      let query = 'SELECT * FROM imports WHERE 1=1';
      const params: any[] = [];
      
      if (filters?.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      
      if (filters?.filename) {
        query += ' AND filename LIKE ?';
        params.push(`%${filters.filename}%`);
      }
      
      if (filters?.dateFrom) {
        query += ' AND import_date >= ?';
        params.push(filters.dateFrom);
      }
      
      if (filters?.dateTo) {
        query += ' AND import_date <= ?';
        params.push(filters.dateTo);
      }
      
      query += ' ORDER BY import_date DESC';
      
      if (pagination?.limit) {
        query += ' LIMIT ?';
        params.push(pagination.limit);
        
        if (pagination?.offset) {
          query += ' OFFSET ?';
          params.push(pagination.offset);
        }
      }
      
      const stmt = db.prepare(query);
      return stmt.all(...params) as ImportRecord[];
    });
  }

  static update(id: number, updates: Partial<Omit<ImportRecord, 'id' | 'created_at'>>): ImportRecord | null {
    return withDatabase(db => {
      const fields = Object.keys(updates).filter(key => updates[key as keyof typeof updates] !== undefined);
      if (fields.length === 0) return this.getById(id);
      
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => updates[field as keyof typeof updates]);
      
      const stmt = db.prepare(`UPDATE imports SET ${setClause} WHERE id = ?`);
      const result = stmt.run(...values, id);
      
      return result.changes > 0 ? this.getById(id) : null;
    });
  }

  static updateStatus(id: number, status: ImportRecord['status'], errorMessages?: string): ImportRecord | null {
    return this.update(id, { status, error_messages: errorMessages });
  }

  static updateLeadCount(id: number, leadCount: number): ImportRecord | null {
    return this.update(id, { lead_count: leadCount });
  }

  static delete(id: number): boolean {
    return withTransaction(db => {
      const stmt = db.prepare('DELETE FROM imports WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    });
  }

  static getCount(filters?: ImportFilters): number {
    return withDatabase(db => {
      let query = 'SELECT COUNT(*) as count FROM imports WHERE 1=1';
      const params: any[] = [];
      
      if (filters?.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      
      if (filters?.filename) {
        query += ' AND filename LIKE ?';
        params.push(`%${filters.filename}%`);
      }
      
      if (filters?.dateFrom) {
        query += ' AND import_date >= ?';
        params.push(filters.dateFrom);
      }
      
      if (filters?.dateTo) {
        query += ' AND import_date <= ?';
        params.push(filters.dateTo);
      }
      
      const stmt = db.prepare(query);
      const result = stmt.get(...params) as { count: number };
      return result.count;
    });
  }

  static getByStatus(status: ImportRecord['status']): ImportRecord[] {
    return this.getAll({ status });
  }

  static getRecent(limit: number = 10): ImportRecord[] {
    return this.getAll({}, { limit });
  }
}
