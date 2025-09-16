import Database from 'better-sqlite3';
import { withDatabase } from '../utils';
import { ImportRecord } from './imports';
import { LeadRecord } from './leads';
import { GeneratedContentRecord } from './generated_content';
import { MappingRecord } from './mappings';

export interface ImportWithStats extends ImportRecord {
  actual_lead_count: number;
  content_count: number;
  mapping_count: number;
}

export interface LeadWithContent extends LeadRecord {
  content_items: GeneratedContentRecord[];
}

export interface LeadWithImport extends LeadRecord {
  import_filename: string;
  import_date: string;
  import_status: string;
}

export interface ContentWithLead extends GeneratedContentRecord {
  lead_company?: string;
  lead_contact_name?: string;
  lead_email?: string;
  import_filename: string;
}

export interface SearchFilters {
  query?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  importId?: number;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface ReportingStats {
  totalImports: number;
  totalLeads: number;
  totalContent: number;
  totalMappings: number;
  leadsByStatus: Record<string, number>;
  contentByStatus: Record<string, number>;
  importsByStatus: Record<string, number>;
  recentActivity: {
    imports: number;
    leads: number;
    content: number;
  };
}

export class AdvancedQueriesDAL {
  // Complex joins between tables
  static getImportsWithStats(pagination?: PaginationOptions): ImportWithStats[] {
    return withDatabase(db => {
      let query = `
        SELECT 
          i.*,
          COALESCE(l.actual_lead_count, 0) as actual_lead_count,
          COALESCE(c.content_count, 0) as content_count,
          COALESCE(m.mapping_count, 0) as mapping_count
        FROM imports i
        LEFT JOIN (
          SELECT import_id, COUNT(*) as actual_lead_count
          FROM leads
          GROUP BY import_id
        ) l ON i.id = l.import_id
        LEFT JOIN (
          SELECT l.import_id, COUNT(gc.*) as content_count
          FROM leads l
          LEFT JOIN generated_content gc ON l.id = gc.lead_id
          GROUP BY l.import_id
        ) c ON i.id = c.import_id
        LEFT JOIN (
          SELECT import_id, COUNT(*) as mapping_count
          FROM mappings
          WHERE is_active = 1
          GROUP BY import_id
        ) m ON i.id = m.import_id
        ORDER BY i.import_date DESC
      `;
      
      if (pagination?.limit) {
        query += ` LIMIT ${pagination.limit}`;
        if (pagination?.offset) {
          query += ` OFFSET ${pagination.offset}`;
        }
      }
      
      const stmt = db.prepare(query);
      return stmt.all() as ImportWithStats[];
    });
  }

  static getLeadsWithContent(importId?: number, pagination?: PaginationOptions): LeadWithContent[] {
    return withDatabase(db => {
      let query = `
        SELECT 
          l.*,
          json_group_array(
            json_object(
              'id', gc.id,
              'touchpoint_number', gc.touchpoint_number,
              'content', gc.content,
              'content_type', gc.content_type,
              'template_id', gc.template_id,
              'status', gc.status,
              'generated_at', gc.generated_at,
              'approved_at', gc.approved_at
            )
          ) FILTER (WHERE gc.id IS NOT NULL) as content_items_json
        FROM leads l
        LEFT JOIN generated_content gc ON l.id = gc.lead_id
      `;
      
      const params: any[] = [];
      if (importId) {
        query += ` WHERE l.import_id = ?`;
        params.push(importId);
      }
      
      query += ` GROUP BY l.id ORDER BY l.created_at DESC`;
      
      if (pagination?.limit) {
        query += ` LIMIT ?`;
        params.push(pagination.limit);
        if (pagination?.offset) {
          query += ` OFFSET ?`;
          params.push(pagination.offset);
        }
      }
      
      const stmt = db.prepare(query);
      const results = stmt.all(...params) as (LeadRecord & { content_items_json: string })[];
      
      return results.map(row => ({
        ...row,
        content_items: row.content_items_json ? JSON.parse(row.content_items_json) : []
      })) as LeadWithContent[];
    });
  }

  static getLeadsWithImportInfo(filters?: SearchFilters, pagination?: PaginationOptions): LeadWithImport[] {
    return withDatabase(db => {
      let query = `
        SELECT 
          l.*,
          i.filename as import_filename,
          i.import_date,
          i.status as import_status
        FROM leads l
        INNER JOIN imports i ON l.import_id = i.id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      if (filters?.importId) {
        query += ` AND l.import_id = ?`;
        params.push(filters.importId);
      }
      
      if (filters?.status) {
        query += ` AND l.status = ?`;
        params.push(filters.status);
      }
      
      if (filters?.dateFrom) {
        query += ` AND l.created_at >= ?`;
        params.push(filters.dateFrom);
      }
      
      if (filters?.dateTo) {
        query += ` AND l.created_at <= ?`;
        params.push(filters.dateTo);
      }
      
      if (filters?.query) {
        query += ` AND (
          l.company LIKE ? OR 
          l.contact_name LIKE ? OR 
          l.email LIKE ? OR
          i.filename LIKE ?
        )`;
        const searchTerm = `%${filters.query}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      query += ` ORDER BY l.created_at DESC`;
      
      if (pagination?.limit) {
        query += ` LIMIT ?`;
        params.push(pagination.limit);
        if (pagination?.offset) {
          query += ` OFFSET ?`;
          params.push(pagination.offset);
        }
      }
      
      const stmt = db.prepare(query);
      return stmt.all(...params) as LeadWithImport[];
    });
  }

  static getContentWithLeadInfo(filters?: SearchFilters, pagination?: PaginationOptions): ContentWithLead[] {
    return withDatabase(db => {
      let query = `
        SELECT 
          gc.*,
          l.company as lead_company,
          l.contact_name as lead_contact_name,
          l.email as lead_email,
          i.filename as import_filename
        FROM generated_content gc
        INNER JOIN leads l ON gc.lead_id = l.id
        INNER JOIN imports i ON l.import_id = i.id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      if (filters?.status) {
        query += ` AND gc.status = ?`;
        params.push(filters.status);
      }
      
      if (filters?.dateFrom) {
        query += ` AND gc.generated_at >= ?`;
        params.push(filters.dateFrom);
      }
      
      if (filters?.dateTo) {
        query += ` AND gc.generated_at <= ?`;
        params.push(filters.dateTo);
      }
      
      if (filters?.query) {
        query += ` AND (
          gc.content LIKE ? OR 
          l.company LIKE ? OR 
          l.contact_name LIKE ? OR 
          l.email LIKE ?
        )`;
        const searchTerm = `%${filters.query}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      query += ` ORDER BY gc.generated_at DESC`;
      
      if (pagination?.limit) {
        query += ` LIMIT ?`;
        params.push(pagination.limit);
        if (pagination?.offset) {
          query += ` OFFSET ?`;
          params.push(pagination.offset);
        }
      }
      
      const stmt = db.prepare(query);
      return stmt.all(...params) as ContentWithLead[];
    });
  }

  // Aggregation queries for reporting
  static getReportingStats(dateFrom?: string, dateTo?: string): ReportingStats {
    return withDatabase(db => {
      let dateFilter = '';
      const params: any[] = [];
      
      if (dateFrom && dateTo) {
        dateFilter = 'WHERE created_at >= ? AND created_at <= ?';
        params.push(dateFrom, dateTo);
      } else if (dateFrom) {
        dateFilter = 'WHERE created_at >= ?';
        params.push(dateFrom);
      } else if (dateTo) {
        dateFilter = 'WHERE created_at <= ?';
        params.push(dateTo);
      }
      
      // Total counts
      const totalImports = db.prepare(`SELECT COUNT(*) as count FROM imports ${dateFilter}`).get(...params) as { count: number };
      const totalLeads = db.prepare(`SELECT COUNT(*) as count FROM leads ${dateFilter}`).get(...params) as { count: number };
      const totalContent = db.prepare(`SELECT COUNT(*) as count FROM generated_content ${dateFilter.replace('created_at', 'generated_at')}`).get(...params) as { count: number };
      const totalMappings = db.prepare(`SELECT COUNT(*) as count FROM mappings ${dateFilter}`).get(...params) as { count: number };
      
      // Status breakdowns
      const leadsByStatus = db.prepare(`SELECT status, COUNT(*) as count FROM leads ${dateFilter} GROUP BY status`).all(...params) as { status: string; count: number }[];
      const contentByStatus = db.prepare(`SELECT status, COUNT(*) as count FROM generated_content ${dateFilter.replace('created_at', 'generated_at')} GROUP BY status`).all(...params) as { status: string; count: number }[];
      const importsByStatus = db.prepare(`SELECT status, COUNT(*) as count FROM imports ${dateFilter.replace('created_at', 'import_date')} GROUP BY status`).all(...params) as { status: string; count: number }[];
      
      // Recent activity (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const recentImports = db.prepare('SELECT COUNT(*) as count FROM imports WHERE import_date >= ?').get(sevenDaysAgo) as { count: number };
      const recentLeads = db.prepare('SELECT COUNT(*) as count FROM leads WHERE created_at >= ?').get(sevenDaysAgo) as { count: number };
      const recentContent = db.prepare('SELECT COUNT(*) as count FROM generated_content WHERE generated_at >= ?').get(sevenDaysAgo) as { count: number };
      
      return {
        totalImports: totalImports.count,
        totalLeads: totalLeads.count,
        totalContent: totalContent.count,
        totalMappings: totalMappings.count,
        leadsByStatus: leadsByStatus.reduce((acc, row) => {
          acc[row.status] = row.count;
          return acc;
        }, {} as Record<string, number>),
        contentByStatus: contentByStatus.reduce((acc, row) => {
          acc[row.status] = row.count;
          return acc;
        }, {} as Record<string, number>),
        importsByStatus: importsByStatus.reduce((acc, row) => {
          acc[row.status] = row.count;
          return acc;
        }, {} as Record<string, number>),
        recentActivity: {
          imports: recentImports.count,
          leads: recentLeads.count,
          content: recentContent.count
        }
      };
    });
  }

  // Search functionality across leads
  static searchLeads(query: string, pagination?: PaginationOptions): LeadWithImport[] {
    return this.getLeadsWithImportInfo({ query }, pagination);
  }

  static searchContent(query: string, pagination?: PaginationOptions): ContentWithLead[] {
    return this.getContentWithLeadInfo({ query }, pagination);
  }

  // Export query functions
  static getExportData(importId: number): {
    import: ImportRecord;
    leads: LeadRecord[];
    mappings: MappingRecord[];
    content: GeneratedContentRecord[];
  } {
    return withDatabase(db => {
      const importStmt = db.prepare('SELECT * FROM imports WHERE id = ?');
      const importRecord = importStmt.get(importId) as ImportRecord;
      
      const leadsStmt = db.prepare('SELECT * FROM leads WHERE import_id = ? ORDER BY created_at');
      const leads = leadsStmt.all(importId) as LeadRecord[];
      
      const mappingsStmt = db.prepare('SELECT * FROM mappings WHERE import_id = ? ORDER BY created_at');
      const mappings = mappingsStmt.all(importId) as MappingRecord[];
      
      const leadIds = leads.map(lead => lead.id).filter(Boolean);
      let content: GeneratedContentRecord[] = [];
      
      if (leadIds.length > 0) {
        const placeholders = leadIds.map(() => '?').join(',');
        const contentStmt = db.prepare(`SELECT * FROM generated_content WHERE lead_id IN (${placeholders}) ORDER BY lead_id, touchpoint_number`);
        content = contentStmt.all(...leadIds) as GeneratedContentRecord[];
      }
      
      return {
        import: importRecord,
        leads,
        mappings,
        content
      };
    });
  }

  static getLeadsForExport(filters?: {
    importId?: number;
    status?: string;
    hasContent?: boolean;
  }): LeadWithContent[] {
    return withDatabase(db => {
      let query = `
        SELECT 
          l.*,
          json_group_array(
            json_object(
              'id', gc.id,
              'touchpoint_number', gc.touchpoint_number,
              'content', gc.content,
              'content_type', gc.content_type,
              'status', gc.status,
              'generated_at', gc.generated_at,
              'approved_at', gc.approved_at
            )
          ) FILTER (WHERE gc.id IS NOT NULL) as content_items_json
        FROM leads l
        LEFT JOIN generated_content gc ON l.id = gc.lead_id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      if (filters?.importId) {
        query += ` AND l.import_id = ?`;
        params.push(filters.importId);
      }
      
      if (filters?.status) {
        query += ` AND l.status = ?`;
        params.push(filters.status);
      }
      
      if (filters?.hasContent) {
        query += ` AND EXISTS (SELECT 1 FROM generated_content WHERE lead_id = l.id)`;
      }
      
      query += ` GROUP BY l.id ORDER BY l.created_at`;
      
      const stmt = db.prepare(query);
      const results = stmt.all(...params) as (LeadRecord & { content_items_json: string })[];
      
      return results.map(row => ({
        ...row,
        content_items: row.content_items_json ? JSON.parse(row.content_items_json) : []
      })) as LeadWithContent[];
    });
  }

  // Performance and analytics queries
  static getPerformanceMetrics(): {
    avgLeadsPerImport: number;
    avgContentPerLead: number;
    contentApprovalRate: number;
    mostUsedMappings: { woodpecker_field: string; usage_count: number }[];
    topCompanies: { company: string; lead_count: number }[];
  } {
    return withDatabase(db => {
      const avgLeadsStmt = db.prepare(`
        SELECT AVG(lead_count) as avg_leads
        FROM (
          SELECT COUNT(*) as lead_count
          FROM leads
          GROUP BY import_id
        )
      `);
      const avgLeads = avgLeadsStmt.get() as { avg_leads: number };
      
      const avgContentStmt = db.prepare(`
        SELECT AVG(content_count) as avg_content
        FROM (
          SELECT COUNT(*) as content_count
          FROM generated_content
          GROUP BY lead_id
        )
      `);
      const avgContent = avgContentStmt.get() as { avg_content: number };
      
      const approvalRateStmt = db.prepare(`
        SELECT 
          (COUNT(CASE WHEN status = 'approved' THEN 1 END) * 100.0 / COUNT(*)) as approval_rate
        FROM generated_content
      `);
      const approvalRate = approvalRateStmt.get() as { approval_rate: number };
      
      const topMappingsStmt = db.prepare(`
        SELECT woodpecker_field, COUNT(*) as usage_count
        FROM mappings
        WHERE is_active = 1
        GROUP BY woodpecker_field
        ORDER BY usage_count DESC
        LIMIT 10
      `);
      const topMappings = topMappingsStmt.all() as { woodpecker_field: string; usage_count: number }[];
      
      const topCompaniesStmt = db.prepare(`
        SELECT company, COUNT(*) as lead_count
        FROM leads
        WHERE company IS NOT NULL AND company != ''
        GROUP BY company
        ORDER BY lead_count DESC
        LIMIT 10
      `);
      const topCompanies = topCompaniesStmt.all() as { company: string; lead_count: number }[];
      
      return {
        avgLeadsPerImport: Math.round((avgLeads.avg_leads || 0) * 100) / 100,
        avgContentPerLead: Math.round((avgContent.avg_content || 0) * 100) / 100,
        contentApprovalRate: Math.round((approvalRate.approval_rate || 0) * 100) / 100,
        mostUsedMappings: topMappings,
        topCompanies
      };
    });
  }
}
