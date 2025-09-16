import Database from 'better-sqlite3';
import { withDatabase, withTransaction } from '../utils';

export interface GeneratedContentRecord {
  id?: number;
  lead_id: number;
  touchpoint_number: number;
  content: string;
  content_type: 'email' | 'subject' | 'template';
  template_id?: string;
  status?: 'draft' | 'approved' | 'rejected';
  generated_at?: string;
  approved_at?: string;
}

export interface ContentFilters {
  lead_id?: number;
  touchpoint_number?: number;
  content_type?: GeneratedContentRecord['content_type'];
  template_id?: string;
  status?: GeneratedContentRecord['status'];
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export class GeneratedContentDAL {
  static create(contentData: Omit<GeneratedContentRecord, 'id' | 'generated_at'>): GeneratedContentRecord {
    return withDatabase(db => {
      const stmt = db.prepare(`
        INSERT INTO generated_content (
          lead_id, touchpoint_number, content, content_type, 
          template_id, status, approved_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        contentData.lead_id,
        contentData.touchpoint_number,
        contentData.content,
        contentData.content_type,
        contentData.template_id || null,
        contentData.status || 'draft',
        contentData.approved_at || null
      );
      
      return this.getById(result.lastInsertRowid as number)!;
    });
  }

  static getById(id: number): GeneratedContentRecord | null {
    return withDatabase(db => {
      const stmt = db.prepare('SELECT * FROM generated_content WHERE id = ?');
      return stmt.get(id) as GeneratedContentRecord | undefined || null;
    });
  }

  static getAll(filters?: ContentFilters, pagination?: PaginationOptions): GeneratedContentRecord[] {
    return withDatabase(db => {
      let query = 'SELECT * FROM generated_content WHERE 1=1';
      const params: any[] = [];
      
      if (filters?.lead_id) {
        query += ' AND lead_id = ?';
        params.push(filters.lead_id);
      }
      
      if (filters?.touchpoint_number) {
        query += ' AND touchpoint_number = ?';
        params.push(filters.touchpoint_number);
      }
      
      if (filters?.content_type) {
        query += ' AND content_type = ?';
        params.push(filters.content_type);
      }
      
      if (filters?.template_id) {
        query += ' AND template_id = ?';
        params.push(filters.template_id);
      }
      
      if (filters?.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      
      if (filters?.dateFrom) {
        query += ' AND generated_at >= ?';
        params.push(filters.dateFrom);
      }
      
      if (filters?.dateTo) {
        query += ' AND generated_at <= ?';
        params.push(filters.dateTo);
      }
      
      query += ' ORDER BY generated_at DESC';
      
      if (pagination?.limit) {
        query += ' LIMIT ?';
        params.push(pagination.limit);
        
        if (pagination?.offset) {
          query += ' OFFSET ?';
          params.push(pagination.offset);
        }
      }
      
      const stmt = db.prepare(query);
      return stmt.all(...params) as GeneratedContentRecord[];
    });
  }

  static update(id: number, updates: Partial<Omit<GeneratedContentRecord, 'id' | 'generated_at'>>): GeneratedContentRecord | null {
    return withDatabase(db => {
      const fields = Object.keys(updates).filter(key => updates[key as keyof typeof updates] !== undefined);
      if (fields.length === 0) return this.getById(id);
      
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => updates[field as keyof typeof updates]);
      
      const stmt = db.prepare(`UPDATE generated_content SET ${setClause} WHERE id = ?`);
      const result = stmt.run(...values, id);
      
      return result.changes > 0 ? this.getById(id) : null;
    });
  }

  static updateStatus(id: number, status: GeneratedContentRecord['status']): GeneratedContentRecord | null {
    const updates: Partial<GeneratedContentRecord> = { status };
    
    if (status === 'approved') {
      updates.approved_at = new Date().toISOString();
    } else if (status === 'draft' || status === 'rejected') {
      updates.approved_at = null;
    }
    
    return this.update(id, updates);
  }

  static updateContent(id: number, content: string): GeneratedContentRecord | null {
    return this.update(id, { content, status: 'draft', approved_at: null });
  }

  static delete(id: number): boolean {
    return withTransaction(db => {
      const stmt = db.prepare('DELETE FROM generated_content WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    });
  }

  static deleteByLead(leadId: number): number {
    return withTransaction(db => {
      const stmt = db.prepare('DELETE FROM generated_content WHERE lead_id = ?');
      const result = stmt.run(leadId);
      return result.changes;
    });
  }

  static getCount(filters?: ContentFilters): number {
    return withDatabase(db => {
      let query = 'SELECT COUNT(*) as count FROM generated_content WHERE 1=1';
      const params: any[] = [];
      
      if (filters?.lead_id) {
        query += ' AND lead_id = ?';
        params.push(filters.lead_id);
      }
      
      if (filters?.touchpoint_number) {
        query += ' AND touchpoint_number = ?';
        params.push(filters.touchpoint_number);
      }
      
      if (filters?.content_type) {
        query += ' AND content_type = ?';
        params.push(filters.content_type);
      }
      
      if (filters?.template_id) {
        query += ' AND template_id = ?';
        params.push(filters.template_id);
      }
      
      if (filters?.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      
      if (filters?.dateFrom) {
        query += ' AND generated_at >= ?';
        params.push(filters.dateFrom);
      }
      
      if (filters?.dateTo) {
        query += ' AND generated_at <= ?';
        params.push(filters.dateTo);
      }
      
      const stmt = db.prepare(query);
      const result = stmt.get(...params) as { count: number };
      return result.count;
    });
  }

  static getByLead(leadId: number, pagination?: PaginationOptions): GeneratedContentRecord[] {
    return this.getAll({ lead_id: leadId }, pagination);
  }

  static getByTouchpoint(leadId: number, touchpointNumber: number): GeneratedContentRecord[] {
    return this.getAll({ lead_id: leadId, touchpoint_number: touchpointNumber });
  }

  static getByStatus(status: GeneratedContentRecord['status'], pagination?: PaginationOptions): GeneratedContentRecord[] {
    return this.getAll({ status }, pagination);
  }

  static getByContentType(contentType: GeneratedContentRecord['content_type'], pagination?: PaginationOptions): GeneratedContentRecord[] {
    return this.getAll({ content_type: contentType }, pagination);
  }

  static getByTemplate(templateId: string, pagination?: PaginationOptions): GeneratedContentRecord[] {
    return this.getAll({ template_id: templateId }, pagination);
  }

  static getApprovedContent(leadId?: number): GeneratedContentRecord[] {
    const filters: ContentFilters = { status: 'approved' };
    if (leadId) {
      filters.lead_id = leadId;
    }
    return this.getAll(filters);
  }

  static getPendingApproval(pagination?: PaginationOptions): GeneratedContentRecord[] {
    return this.getAll({ status: 'draft' }, pagination);
  }

  static getLeadSequence(leadId: number): GeneratedContentRecord[] {
    return withDatabase(db => {
      const stmt = db.prepare(`
        SELECT * FROM generated_content 
        WHERE lead_id = ? 
        ORDER BY touchpoint_number ASC, content_type ASC
      `);
      return stmt.all(leadId) as GeneratedContentRecord[];
    });
  }

  static getContentStats(): { total: number; byStatus: Record<string, number>; byType: Record<string, number> } {
    return withDatabase(db => {
      const totalStmt = db.prepare('SELECT COUNT(*) as count FROM generated_content');
      const total = (totalStmt.get() as { count: number }).count;
      
      const statusStmt = db.prepare('SELECT status, COUNT(*) as count FROM generated_content GROUP BY status');
      const statusResults = statusStmt.all() as { status: string; count: number }[];
      const byStatus = statusResults.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {} as Record<string, number>);
      
      const typeStmt = db.prepare('SELECT content_type, COUNT(*) as count FROM generated_content GROUP BY content_type');
      const typeResults = typeStmt.all() as { content_type: string; count: number }[];
      const byType = typeResults.reduce((acc, row) => {
        acc[row.content_type] = row.count;
        return acc;
      }, {} as Record<string, number>);
      
      return { total, byStatus, byType };
    });
  }

  static bulkUpdateStatus(ids: number[], status: GeneratedContentRecord['status']): number {
    return withTransaction(db => {
      const placeholders = ids.map(() => '?').join(',');
      let query = `UPDATE generated_content SET status = ?`;
      const params = [status];
      
      if (status === 'approved') {
        query += `, approved_at = ?`;
        params.push(new Date().toISOString());
      } else if (status === 'draft' || status === 'rejected') {
        query += `, approved_at = NULL`;
      }
      
      query += ` WHERE id IN (${placeholders})`;
      params.push(...ids);
      
      const stmt = db.prepare(query);
      const result = stmt.run(...params);
      return result.changes;
    });
  }
}
