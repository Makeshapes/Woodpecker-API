import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdvancedQueriesDAL } from '../queries';
import { ImportsDAL } from '../imports';
import { LeadsDAL } from '../leads';
import { GeneratedContentDAL } from '../generated_content';
import { MappingsDAL } from '../mappings';
import { initializeDatabase, closeDatabase } from '../../init';
import { getDatabase } from '../../init';

describe('AdvancedQueriesDAL', () => {
  let importId: number;
  let leadId: number;

  beforeEach(() => {
    initializeDatabase(':memory:');
    
    // Create test data
    const importRecord = ImportsDAL.create({
      filename: 'test.csv',
      status: 'completed',
      lead_count: 2
    });
    importId = importRecord.id!;

    const leadRecord = LeadsDAL.create({
      import_id: importId,
      company: 'Test Company',
      contact_name: 'John Doe',
      email: 'john@test.com',
      status: 'processed'
    });
    leadId = leadRecord.id!;

    // Create additional test data
    LeadsDAL.create({
      import_id: importId,
      company: 'Another Company',
      contact_name: 'Jane Smith',
      email: 'jane@test.com',
      status: 'pending'
    });

    GeneratedContentDAL.create({
      lead_id: leadId,
      touchpoint_number: 1,
      content: 'Test email content',
      content_type: 'email',
      status: 'approved'
    });

    MappingsDAL.create({
      import_id: importId,
      csv_column: 'Company',
      woodpecker_field: 'company',
      is_active: true
    });
  });

  afterEach(() => {
    const db = getDatabase();
    if (db) {
      closeDatabase(db);
    }
  });

  describe('getImportsWithStats', () => {
    it('should get imports with statistics', () => {
      const results = AdvancedQueriesDAL.getImportsWithStats();
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(importId);
      expect(results[0].filename).toBe('test.csv');
      expect(results[0].actual_lead_count).toBe(2);
      expect(results[0].content_count).toBe(1);
      expect(results[0].mapping_count).toBe(1);
    });

    it('should support pagination', () => {
      // Create another import
      ImportsDAL.create({
        filename: 'test2.csv',
        status: 'pending'
      });

      const results = AdvancedQueriesDAL.getImportsWithStats({ limit: 1 });
      expect(results).toHaveLength(1);
    });
  });

  describe('getLeadsWithContent', () => {
    it('should get leads with their content', () => {
      const results = AdvancedQueriesDAL.getLeadsWithContent();
      
      expect(results).toHaveLength(2);
      
      const leadWithContent = results.find(r => r.id === leadId);
      expect(leadWithContent).toBeDefined();
      expect(leadWithContent!.content_items).toHaveLength(1);
      expect(leadWithContent!.content_items[0].content).toBe('Test email content');
      
      const leadWithoutContent = results.find(r => r.id !== leadId);
      expect(leadWithoutContent).toBeDefined();
      expect(leadWithoutContent!.content_items).toHaveLength(0);
    });

    it('should filter by import id', () => {
      const results = AdvancedQueriesDAL.getLeadsWithContent(importId);
      expect(results).toHaveLength(2);
    });

    it('should support pagination', () => {
      const results = AdvancedQueriesDAL.getLeadsWithContent(undefined, { limit: 1 });
      expect(results).toHaveLength(1);
    });
  });

  describe('getLeadsWithImportInfo', () => {
    it('should get leads with import information', () => {
      const results = AdvancedQueriesDAL.getLeadsWithImportInfo();
      
      expect(results).toHaveLength(2);
      expect(results[0].import_filename).toBe('test.csv');
      expect(results[0].import_status).toBe('completed');
    });

    it('should filter by import id', () => {
      const results = AdvancedQueriesDAL.getLeadsWithImportInfo({ importId });
      expect(results).toHaveLength(2);
    });

    it('should filter by status', () => {
      const results = AdvancedQueriesDAL.getLeadsWithImportInfo({ status: 'processed' });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('processed');
    });

    it('should search by query', () => {
      const results = AdvancedQueriesDAL.getLeadsWithImportInfo({ query: 'Test Company' });
      expect(results).toHaveLength(1);
      expect(results[0].company).toBe('Test Company');
    });

    it('should support pagination', () => {
      const results = AdvancedQueriesDAL.getLeadsWithImportInfo({}, { limit: 1 });
      expect(results).toHaveLength(1);
    });
  });

  describe('getContentWithLeadInfo', () => {
    it('should get content with lead information', () => {
      const results = AdvancedQueriesDAL.getContentWithLeadInfo();
      
      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('Test email content');
      expect(results[0].lead_company).toBe('Test Company');
      expect(results[0].lead_contact_name).toBe('John Doe');
      expect(results[0].lead_email).toBe('john@test.com');
      expect(results[0].import_filename).toBe('test.csv');
    });

    it('should filter by status', () => {
      const results = AdvancedQueriesDAL.getContentWithLeadInfo({ status: 'approved' });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('approved');
    });

    it('should search by query', () => {
      const results = AdvancedQueriesDAL.getContentWithLeadInfo({ query: 'Test email' });
      expect(results).toHaveLength(1);
    });
  });

  describe('getReportingStats', () => {
    it('should get comprehensive reporting statistics', () => {
      const stats = AdvancedQueriesDAL.getReportingStats();
      
      expect(stats.totalImports).toBe(1);
      expect(stats.totalLeads).toBe(2);
      expect(stats.totalContent).toBe(1);
      expect(stats.totalMappings).toBe(1);
      
      expect(stats.leadsByStatus.processed).toBe(1);
      expect(stats.leadsByStatus.pending).toBe(1);
      
      expect(stats.contentByStatus.approved).toBe(1);
      
      expect(stats.importsByStatus.completed).toBe(1);
      
      expect(stats.recentActivity).toBeDefined();
      expect(stats.recentActivity.imports).toBe(1);
      expect(stats.recentActivity.leads).toBe(2);
      expect(stats.recentActivity.content).toBe(1);
    });

    it('should filter by date range', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      const stats = AdvancedQueriesDAL.getReportingStats(yesterday, tomorrow);
      
      expect(stats.totalImports).toBe(1);
      expect(stats.totalLeads).toBe(2);
    });
  });

  describe('searchLeads', () => {
    it('should search leads by query', () => {
      const results = AdvancedQueriesDAL.searchLeads('Test Company');
      expect(results).toHaveLength(1);
      expect(results[0].company).toBe('Test Company');
    });

    it('should support pagination', () => {
      const results = AdvancedQueriesDAL.searchLeads('Company', { limit: 1 });
      expect(results).toHaveLength(1);
    });
  });

  describe('searchContent', () => {
    it('should search content by query', () => {
      const results = AdvancedQueriesDAL.searchContent('Test email');
      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('Test email content');
    });
  });

  describe('getExportData', () => {
    it('should get complete export data for an import', () => {
      const exportData = AdvancedQueriesDAL.getExportData(importId);
      
      expect(exportData.import).toBeDefined();
      expect(exportData.import.id).toBe(importId);
      
      expect(exportData.leads).toHaveLength(2);
      expect(exportData.mappings).toHaveLength(1);
      expect(exportData.content).toHaveLength(1);
    });
  });

  describe('getLeadsForExport', () => {
    it('should get leads for export', () => {
      const results = AdvancedQueriesDAL.getLeadsForExport();
      expect(results).toHaveLength(2);
    });

    it('should filter by import id', () => {
      const results = AdvancedQueriesDAL.getLeadsForExport({ importId });
      expect(results).toHaveLength(2);
    });

    it('should filter by status', () => {
      const results = AdvancedQueriesDAL.getLeadsForExport({ status: 'processed' });
      expect(results).toHaveLength(1);
    });

    it('should filter by hasContent', () => {
      const results = AdvancedQueriesDAL.getLeadsForExport({ hasContent: true });
      expect(results).toHaveLength(1);
      expect(results[0].content_items).toHaveLength(1);
    });
  });

  describe('getPerformanceMetrics', () => {
    beforeEach(() => {
      // Create additional test data for better metrics
      const import2 = ImportsDAL.create({
        filename: 'test2.csv',
        status: 'completed'
      });
      
      const lead2 = LeadsDAL.create({
        import_id: import2.id!,
        company: 'Acme Corp',
        email: 'test@acme.com'
      });
      
      GeneratedContentDAL.create({
        lead_id: lead2.id!,
        touchpoint_number: 1,
        content: 'Another email',
        content_type: 'email',
        status: 'draft'
      });
      
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 2,
        content: 'Follow up email',
        content_type: 'email',
        status: 'approved'
      });
      
      MappingsDAL.create({
        import_id: importId,
        csv_column: 'Email',
        woodpecker_field: 'email',
        is_active: true
      });
      
      MappingsDAL.create({
        import_id: import2.id!,
        csv_column: 'Company',
        woodpecker_field: 'company',
        is_active: true
      });
    });

    it('should get performance metrics', () => {
      const metrics = AdvancedQueriesDAL.getPerformanceMetrics();
      
      expect(metrics.avgLeadsPerImport).toBeGreaterThan(0);
      expect(metrics.avgContentPerLead).toBeGreaterThan(0);
      expect(metrics.contentApprovalRate).toBeGreaterThanOrEqual(0);
      expect(metrics.contentApprovalRate).toBeLessThanOrEqual(100);
      
      expect(metrics.mostUsedMappings).toBeDefined();
      expect(metrics.mostUsedMappings.length).toBeGreaterThan(0);
      expect(metrics.mostUsedMappings[0]).toHaveProperty('woodpecker_field');
      expect(metrics.mostUsedMappings[0]).toHaveProperty('usage_count');
      
      expect(metrics.topCompanies).toBeDefined();
      expect(metrics.topCompanies.length).toBeGreaterThan(0);
      expect(metrics.topCompanies[0]).toHaveProperty('company');
      expect(metrics.topCompanies[0]).toHaveProperty('lead_count');
    });

    it('should calculate correct approval rate', () => {
      const metrics = AdvancedQueriesDAL.getPerformanceMetrics();
      
      // We have 2 approved out of 3 total content items = 66.67%
      expect(metrics.contentApprovalRate).toBeCloseTo(66.67, 1);
    });
  });
});
