import Database from 'better-sqlite3';
import { withDatabase, withTransaction } from '../utils';

export interface LeadRecord {
  id?: number;
  import_id: number;
  // Core Woodpecker fields
  first_name?: string;
  last_name?: string;
  company?: string;
  email?: string;
  title?: string;
  phone?: string;
  website?: string;
  linkedin_url?: string;
  // Location fields
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  // Additional Woodpecker fields
  industry?: string;
  tags?: string;
  // Custom snippets (1-15)
  snippet1?: string;
  snippet2?: string;
  snippet3?: string;
  snippet4?: string;
  snippet5?: string;
  snippet6?: string;
  snippet7?: string;
  snippet8?: string;
  snippet9?: string;
  snippet10?: string;
  snippet11?: string;
  snippet12?: string;
  snippet13?: string;
  snippet14?: string;
  snippet15?: string;
  // Legacy field for truly custom data
  additional_fields?: string; // JSON string for non-standard fields
  // Status and tracking
  status?: 'imported' | 'generating' | 'drafted' | 'approved' | 'exported' | 'failed' | 'deleted';
  woodpecker_campaign_id?: string;
  export_date?: string;
  created_at?: string;
}

export interface LeadFilters {
  import_id?: number;
  status?: LeadRecord['status'];
  company?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
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
          import_id, first_name, last_name, company, email, title,
          phone, website, linkedin_url, address, city, state, country,
          industry, tags, snippet1, snippet2, snippet3, snippet4, snippet5,
          snippet6, snippet7, snippet8, snippet9, snippet10, snippet11,
          snippet12, snippet13, snippet14, snippet15,
          additional_fields, status, woodpecker_campaign_id, export_date
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        leadData.import_id,
        leadData.first_name || null,
        leadData.last_name || null,
        leadData.company || null,
        leadData.email || null,
        leadData.title || null,
        leadData.phone || null,
        leadData.website || null,
        leadData.linkedin_url || null,
        leadData.address || null,
        leadData.city || null,
        leadData.state || null,
        leadData.country || null,
        leadData.industry || null,
        leadData.tags || null,
        leadData.snippet1 || null,
        leadData.snippet2 || null,
        leadData.snippet3 || null,
        leadData.snippet4 || null,
        leadData.snippet5 || null,
        leadData.snippet6 || null,
        leadData.snippet7 || null,
        leadData.snippet8 || null,
        leadData.snippet9 || null,
        leadData.snippet10 || null,
        leadData.snippet11 || null,
        leadData.snippet12 || null,
        leadData.snippet13 || null,
        leadData.snippet14 || null,
        leadData.snippet15 || null,
        leadData.additional_fields || null,
        leadData.status || 'imported',
        leadData.woodpecker_campaign_id || null,
        leadData.export_date || null
      );

      return this.getById(result.lastInsertRowid as number)!;
    });
  }

  static bulkCreate(bulkData: BulkLeadData): { created: LeadRecord[], skipped: number } {
    return withTransaction(db => {
      const stmt = db.prepare(`
        INSERT INTO leads (
          import_id, first_name, last_name, company, email, title,
          phone, website, linkedin_url, address, city, state, country,
          industry, tags, snippet1, snippet2, snippet3, snippet4, snippet5,
          snippet6, snippet7, snippet8, snippet9, snippet10, snippet11,
          snippet12, snippet13, snippet14, snippet15,
          additional_fields, status, woodpecker_campaign_id, export_date
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const duplicateCheckStmt = db.prepare(`
        SELECT COUNT(*) as count FROM leads WHERE email = ? AND email IS NOT NULL
      `);

      const created: LeadRecord[] = [];
      let skipped = 0;

      for (const lead of bulkData.leads) {
        // Skip if email already exists (duplicate detection)
        if (lead.email) {
          const existing = duplicateCheckStmt.get(lead.email) as { count: number };
          if (existing.count > 0) {
            skipped++;
            continue;
          }
        }

        try {
          const result = stmt.run(
            bulkData.import_id,
            lead.first_name || null,
            lead.last_name || null,
            lead.company || null,
            lead.email || null,
            lead.title || null,
            lead.phone || null,
            lead.website || null,
            lead.linkedin_url || null,
            lead.address || null,
            lead.city || null,
            lead.state || null,
            lead.country || null,
            lead.industry || null,
            lead.tags || null,
            lead.snippet1 || null,
            lead.snippet2 || null,
            lead.snippet3 || null,
            lead.snippet4 || null,
            lead.snippet5 || null,
            lead.snippet6 || null,
            lead.snippet7 || null,
            lead.snippet8 || null,
            lead.snippet9 || null,
            lead.snippet10 || null,
            lead.snippet11 || null,
            lead.snippet12 || null,
            lead.snippet13 || null,
            lead.snippet14 || null,
            lead.snippet15 || null,
            lead.additional_fields || null,
            lead.status || 'imported',
            lead.woodpecker_campaign_id || null,
            lead.export_date || null
          );

          const newLead = this.getById(result.lastInsertRowid as number);
          if (newLead) created.push(newLead);
        } catch (error: any) {
          // Handle unique constraint errors as duplicates
          if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            skipped++;
          } else {
            throw error;
          }
        }
      }

      return { created, skipped };
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
      
      if (filters?.first_name) {
        query += ' AND first_name LIKE ?';
        params.push(`%${filters.first_name}%`);
      }

      if (filters?.last_name) {
        query += ' AND last_name LIKE ?';
        params.push(`%${filters.last_name}%`);
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
      
      if (filters?.first_name) {
        query += ' AND first_name LIKE ?';
        params.push(`%${filters.first_name}%`);
      }

      if (filters?.last_name) {
        query += ' AND last_name LIKE ?';
        params.push(`%${filters.last_name}%`);
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
