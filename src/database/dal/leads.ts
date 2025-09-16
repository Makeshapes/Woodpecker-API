import Database from 'better-sqlite3';
import { withDatabase, withTransaction } from '../utils';

export interface LeadRecord {
  id?: number;
  import_id: number;
  company?: string;
  contact_name?: string;
  email?: string;
  title?: string;
  additional_fields?: string; // JSON string
  status?: 'pending' | 'processed' | 'exported' | 'failed';
  woodpecker_campaign_id?: string;
  export_date?: string;
  created_at?: string;
}

export interface LeadFilters {
  import_id?: number;
  status?: LeadRecord['status'];
  company?: string;
  email?: string;
  contact_name?: string;
  woodpecker_campaign_id?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface BulkLeadData {
  import_id: number;
  leads: Omit<LeadRecord, 'id' | 'import_id' | 'created_at'>[];
}

export class LeadsDAL {
  static create(leadData: Omit<LeadRecord, 'id' | 'created_at'>): LeadRecord {
    return withDatabase(db => {
      const stmt = db.prepare(`
        INSERT INTO leads (
          import_id, company, contact_name, email, title, 
          additional_fields, status, woodpecker_campaign_id, export_date
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        leadData.import_id,
        leadData.company || null,
        leadData.contact_name || null,
        leadData.email || null,
        leadData.title || null,
        leadData.additional_fields || null,
        leadData.status || 'pending',
        leadData.woodpecker_campaign_id || null,
        leadData.export_date || null
      );
      
      return this.getById(result.lastInsertRowid as number)!;
    });
  }

  static bulkCreate(bulkData: BulkLeadData): LeadRecord[] {
    return withTransaction(db => {
      const stmt = db.prepare(`
        INSERT INTO leads (
          import_id, company, contact_name, email, title, 
          additional_fields, status, woodpecker_campaign_id, export_date
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const results: LeadRecord[] = [];
      
      for (const lead of bulkData.leads) {
        const result = stmt.run(
          bulkData.import_id,
          lead.company || null,
          lead.contact_name || null,
          lead.email || null,
          lead.title || null,
          lead.additional_fields || null,
          lead.status || 'pending',
          lead.woodpecker_campaign_id || null,
          lead.export_date || null
        );
        
        const created = this.getById(result.lastInsertRowid as number);
        if (created) results.push(created);
      }
      
      return results;
    });
  }

  static getById(id: number): LeadRecord | null {
    return withDatabase(db => {
      const stmt = db.prepare('SELECT * FROM leads WHERE id = ?');
      return stmt.get(id) as LeadRecord | undefined || null;
    });
  }

  static getAll(filters?: LeadFilters, pagination?: PaginationOptions): LeadRecord[] {
    return withDatabase(db => {
      let query = 'SELECT * FROM leads WHERE 1=1';
      const params: any[] = [];
      
      if (filters?.import_id) {
        query += ' AND import_id = ?';
        params.push(filters.import_id);
      }
      
      if (filters?.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      
      if (filters?.company) {
        query += ' AND company LIKE ?';
        params.push(`%${filters.company}%`);
      }
      
      if (filters?.email) {
        query += ' AND email LIKE ?';
        params.push(`%${filters.email}%`);
      }
      
      if (filters?.contact_name) {
        query += ' AND contact_name LIKE ?';
        params.push(`%${filters.contact_name}%`);
      }
      
      if (filters?.woodpecker_campaign_id) {
        query += ' AND woodpecker_campaign_id = ?';
        params.push(filters.woodpecker_campaign_id);
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
      return stmt.all(...params) as LeadRecord[];
    });
  }

  static update(id: number, updates: Partial<Omit<LeadRecord, 'id' | 'created_at'>>): LeadRecord | null {
    return withDatabase(db => {
      const fields = Object.keys(updates).filter(key => updates[key as keyof typeof updates] !== undefined);
      if (fields.length === 0) return this.getById(id);
      
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => updates[field as keyof typeof updates]);
      
      const stmt = db.prepare(`UPDATE leads SET ${setClause} WHERE id = ?`);
      const result = stmt.run(...values, id);
      
      return result.changes > 0 ? this.getById(id) : null;
    });
  }

  static updateStatus(id: number, status: LeadRecord['status']): LeadRecord | null {
    return this.update(id, { status });
  }

  static updateWoodpeckerCampaign(id: number, campaignId: string, exportDate?: string): LeadRecord | null {
    return this.update(id, { 
      woodpecker_campaign_id: campaignId,
      export_date: exportDate || new Date().toISOString(),
      status: 'exported'
    });
  }

  static bulkUpdateStatus(ids: number[], status: LeadRecord['status']): number {
    return withTransaction(db => {
      const placeholders = ids.map(() => '?').join(',');
      const stmt = db.prepare(`UPDATE leads SET status = ? WHERE id IN (${placeholders})`);
      const result = stmt.run(status, ...ids);
      return result.changes;
    });
  }

  static delete(id: number): boolean {
    return withTransaction(db => {
      const stmt = db.prepare('DELETE FROM leads WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    });
  }

  static deleteByImport(importId: number): number {
    return withTransaction(db => {
      const stmt = db.prepare('DELETE FROM leads WHERE import_id = ?');
      const result = stmt.run(importId);
      return result.changes;
    });
  }

  static getCount(filters?: LeadFilters): number {
    return withDatabase(db => {
      let query = 'SELECT COUNT(*) as count FROM leads WHERE 1=1';
      const params: any[] = [];
      
      if (filters?.import_id) {
        query += ' AND import_id = ?';
        params.push(filters.import_id);
      }
      
      if (filters?.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      
      if (filters?.company) {
        query += ' AND company LIKE ?';
        params.push(`%${filters.company}%`);
      }
      
      if (filters?.email) {
        query += ' AND email LIKE ?';
        params.push(`%${filters.email}%`);
      }
      
      if (filters?.contact_name) {
        query += ' AND contact_name LIKE ?';
        params.push(`%${filters.contact_name}%`);
      }
      
      if (filters?.woodpecker_campaign_id) {
        query += ' AND woodpecker_campaign_id = ?';
        params.push(filters.woodpecker_campaign_id);
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

  static getByImport(importId: number, pagination?: PaginationOptions): LeadRecord[] {
    return this.getAll({ import_id: importId }, pagination);
  }

  static getByStatus(status: LeadRecord['status'], pagination?: PaginationOptions): LeadRecord[] {
    return this.getAll({ status }, pagination);
  }

  static searchByEmail(email: string): LeadRecord[] {
    return this.getAll({ email });
  }

  static searchByCompany(company: string, pagination?: PaginationOptions): LeadRecord[] {
    return this.getAll({ company }, pagination);
  }

  static getExportedLeads(campaignId?: string): LeadRecord[] {
    const filters: LeadFilters = { status: 'exported' };
    if (campaignId) {
      filters.woodpecker_campaign_id = campaignId;
    }
    return this.getAll(filters);
  }

  static getLeadsWithAdditionalFields(): LeadRecord[] {
    return withDatabase(db => {
      const stmt = db.prepare('SELECT * FROM leads WHERE additional_fields IS NOT NULL AND additional_fields != "" ORDER BY created_at DESC');
      return stmt.all() as LeadRecord[];
    });
  }
}
