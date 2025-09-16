import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GeneratedContentDAL, GeneratedContentRecord } from '../generated_content';
import { LeadsDAL } from '../leads';
import { ImportsDAL } from '../imports';
import { initializeDatabase, closeDatabase } from '../../init';
import { getDatabase } from '../../init';

describe('GeneratedContentDAL', () => {
  let importId: number;
  let leadId: number;

  beforeEach(() => {
    initializeDatabase(':memory:');
    const importRecord = ImportsDAL.create({
      filename: 'test.csv',
      status: 'pending'
    });
    importId = importRecord.id!;

    const leadRecord = LeadsDAL.create({
      import_id: importId,
      company: 'Test Company',
      email: 'test@example.com'
    });
    leadId = leadRecord.id!;
  });

  afterEach(() => {
    const db = getDatabase();
    if (db) {
      closeDatabase(db);
    }
  });

  describe('create', () => {
    it('should create a new content record', () => {
      const contentData = {
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Hello {{contact_name}}, I hope this email finds you well.',
        content_type: 'email' as const,
        template_id: 'template-123'
      };

      const result = GeneratedContentDAL.create(contentData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.lead_id).toBe(leadId);
      expect(result.touchpoint_number).toBe(1);
      expect(result.content).toBe('Hello {{contact_name}}, I hope this email finds you well.');
      expect(result.content_type).toBe('email');
      expect(result.status).toBe('draft');
      expect(result.generated_at).toBeDefined();
    });

    it('should create content with minimal data', () => {
      const contentData = {
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Test content',
        content_type: 'email' as const
      };

      const result = GeneratedContentDAL.create(contentData);

      expect(result).toBeDefined();
      expect(result.status).toBe('draft');
      expect(result.template_id).toBeNull();
    });
  });

  describe('getById', () => {
    it('should retrieve content by id', () => {
      const created = GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Test content',
        content_type: 'email'
      });

      const retrieved = GeneratedContentDAL.getById(created.id!);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.content).toBe('Test content');
    });

    it('should return null for non-existent id', () => {
      const result = GeneratedContentDAL.getById(999);
      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    beforeEach(() => {
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Email 1',
        content_type: 'email',
        status: 'draft'
      });
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Subject 1',
        content_type: 'subject',
        status: 'approved'
      });
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 2,
        content: 'Email 2',
        content_type: 'email',
        status: 'rejected'
      });
    });

    it('should retrieve all content', () => {
      const results = GeneratedContentDAL.getAll();
      expect(results).toHaveLength(3);
    });

    it('should filter by lead_id', () => {
      const results = GeneratedContentDAL.getAll({ lead_id: leadId });
      expect(results).toHaveLength(3);
    });

    it('should filter by touchpoint_number', () => {
      const results = GeneratedContentDAL.getAll({ touchpoint_number: 1 });
      expect(results).toHaveLength(2);
    });

    it('should filter by content_type', () => {
      const results = GeneratedContentDAL.getAll({ content_type: 'email' });
      expect(results).toHaveLength(2);
    });

    it('should filter by status', () => {
      const results = GeneratedContentDAL.getAll({ status: 'approved' });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('approved');
    });

    it('should support pagination', () => {
      const results = GeneratedContentDAL.getAll({}, { limit: 2 });
      expect(results).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update content record', () => {
      const created = GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Original content',
        content_type: 'email',
        status: 'draft'
      });

      const updated = GeneratedContentDAL.update(created.id!, {
        content: 'Updated content',
        status: 'approved'
      });

      expect(updated).toBeDefined();
      expect(updated!.content).toBe('Updated content');
      expect(updated!.status).toBe('approved');
    });

    it('should return null for non-existent id', () => {
      const result = GeneratedContentDAL.update(999, { content: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update status to approved with timestamp', () => {
      const created = GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Test content',
        content_type: 'email',
        status: 'draft'
      });

      const updated = GeneratedContentDAL.updateStatus(created.id!, 'approved');

      expect(updated!.status).toBe('approved');
      expect(updated!.approved_at).toBeDefined();
    });

    it('should update status to rejected and clear approved_at', () => {
      const created = GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Test content',
        content_type: 'email',
        status: 'approved',
        approved_at: new Date().toISOString()
      });

      const updated = GeneratedContentDAL.updateStatus(created.id!, 'rejected');

      expect(updated!.status).toBe('rejected');
      expect(updated!.approved_at).toBeNull();
    });
  });

  describe('updateContent', () => {
    it('should update content and reset status to draft', () => {
      const created = GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Original content',
        content_type: 'email',
        status: 'approved',
        approved_at: new Date().toISOString()
      });

      const updated = GeneratedContentDAL.updateContent(created.id!, 'New content');

      expect(updated!.content).toBe('New content');
      expect(updated!.status).toBe('draft');
      expect(updated!.approved_at).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete content record', () => {
      const created = GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Test content',
        content_type: 'email'
      });

      const deleted = GeneratedContentDAL.delete(created.id!);
      expect(deleted).toBe(true);

      const retrieved = GeneratedContentDAL.getById(created.id!);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent id', () => {
      const result = GeneratedContentDAL.delete(999);
      expect(result).toBe(false);
    });
  });

  describe('deleteByLead', () => {
    it('should delete all content for a lead', () => {
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Content 1',
        content_type: 'email'
      });
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 2,
        content: 'Content 2',
        content_type: 'email'
      });

      const deleted = GeneratedContentDAL.deleteByLead(leadId);
      expect(deleted).toBe(2);

      const remaining = GeneratedContentDAL.getByLead(leadId);
      expect(remaining).toHaveLength(0);
    });
  });

  describe('getCount', () => {
    beforeEach(() => {
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Content 1',
        content_type: 'email',
        status: 'draft'
      });
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 2,
        content: 'Content 2',
        content_type: 'email',
        status: 'approved'
      });
    });

    it('should count all content', () => {
      const count = GeneratedContentDAL.getCount();
      expect(count).toBe(2);
    });

    it('should count filtered content', () => {
      const count = GeneratedContentDAL.getCount({ status: 'draft' });
      expect(count).toBe(1);
    });
  });

  describe('getByLead', () => {
    it('should get content by lead id', () => {
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Content 1',
        content_type: 'email'
      });
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 2,
        content: 'Content 2',
        content_type: 'email'
      });

      const results = GeneratedContentDAL.getByLead(leadId);
      expect(results).toHaveLength(2);
    });
  });

  describe('getByTouchpoint', () => {
    beforeEach(() => {
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Email 1',
        content_type: 'email'
      });
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Subject 1',
        content_type: 'subject'
      });
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 2,
        content: 'Email 2',
        content_type: 'email'
      });
    });

    it('should get content by touchpoint', () => {
      const results = GeneratedContentDAL.getByTouchpoint(leadId, 1);
      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.touchpoint_number).toBe(1);
      });
    });
  });

  describe('getByStatus', () => {
    beforeEach(() => {
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Content 1',
        content_type: 'email',
        status: 'draft'
      });
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 2,
        content: 'Content 2',
        content_type: 'email',
        status: 'draft'
      });
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 3,
        content: 'Content 3',
        content_type: 'email',
        status: 'approved'
      });
    });

    it('should get content by status', () => {
      const results = GeneratedContentDAL.getByStatus('draft');
      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.status).toBe('draft');
      });
    });
  });

  describe('getByContentType', () => {
    beforeEach(() => {
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Email content',
        content_type: 'email'
      });
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Subject line',
        content_type: 'subject'
      });
    });

    it('should get content by type', () => {
      const results = GeneratedContentDAL.getByContentType('email');
      expect(results).toHaveLength(1);
      expect(results[0].content_type).toBe('email');
    });
  });

  describe('getApprovedContent', () => {
    beforeEach(() => {
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Content 1',
        content_type: 'email',
        status: 'approved'
      });
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 2,
        content: 'Content 2',
        content_type: 'email',
        status: 'draft'
      });
    });

    it('should get approved content', () => {
      const results = GeneratedContentDAL.getApprovedContent();
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('approved');
    });

    it('should get approved content for specific lead', () => {
      const results = GeneratedContentDAL.getApprovedContent(leadId);
      expect(results).toHaveLength(1);
      expect(results[0].lead_id).toBe(leadId);
    });
  });

  describe('getPendingApproval', () => {
    beforeEach(() => {
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Content 1',
        content_type: 'email',
        status: 'draft'
      });
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 2,
        content: 'Content 2',
        content_type: 'email',
        status: 'approved'
      });
    });

    it('should get pending approval content', () => {
      const results = GeneratedContentDAL.getPendingApproval();
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('draft');
    });
  });

  describe('getLeadSequence', () => {
    beforeEach(() => {
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 2,
        content: 'Email 2',
        content_type: 'email'
      });
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Subject 1',
        content_type: 'subject'
      });
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Email 1',
        content_type: 'email'
      });
    });

    it('should get lead sequence ordered by touchpoint and type', () => {
      const results = GeneratedContentDAL.getLeadSequence(leadId);
      expect(results).toHaveLength(3);
      
      // Should be ordered by touchpoint_number ASC, content_type ASC
      expect(results[0].touchpoint_number).toBe(1);
      expect(results[0].content_type).toBe('email');
      expect(results[1].touchpoint_number).toBe(1);
      expect(results[1].content_type).toBe('subject');
      expect(results[2].touchpoint_number).toBe(2);
    });
  });

  describe('getContentStats', () => {
    beforeEach(() => {
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Content 1',
        content_type: 'email',
        status: 'draft'
      });
      GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 2,
        content: 'Content 2',
        content_type: 'subject',
        status: 'approved'
      });
    });

    it('should get content statistics', () => {
      const stats = GeneratedContentDAL.getContentStats();
      
      expect(stats.total).toBe(2);
      expect(stats.byStatus.draft).toBe(1);
      expect(stats.byStatus.approved).toBe(1);
      expect(stats.byType.email).toBe(1);
      expect(stats.byType.subject).toBe(1);
    });
  });

  describe('bulkUpdateStatus', () => {
    it('should update multiple content records status', () => {
      const content1 = GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 1,
        content: 'Content 1',
        content_type: 'email',
        status: 'draft'
      });
      const content2 = GeneratedContentDAL.create({
        lead_id: leadId,
        touchpoint_number: 2,
        content: 'Content 2',
        content_type: 'email',
        status: 'draft'
      });

      const updated = GeneratedContentDAL.bulkUpdateStatus([content1.id!, content2.id!], 'approved');

      expect(updated).toBe(2);

      const updatedContent1 = GeneratedContentDAL.getById(content1.id!);
      const updatedContent2 = GeneratedContentDAL.getById(content2.id!);

      expect(updatedContent1!.status).toBe('approved');
      expect(updatedContent1!.approved_at).toBeDefined();
      expect(updatedContent2!.status).toBe('approved');
      expect(updatedContent2!.approved_at).toBeDefined();
    });
  });
});
