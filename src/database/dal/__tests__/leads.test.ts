import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LeadsDAL, LeadRecord, BulkLeadData } from '../leads';
import { ImportsDAL } from '../imports';
import { initializeDatabase, closeDatabase } from '../../init';
import { getDatabase } from '../../init';

describe('LeadsDAL', () => {
  let importId: number;

  beforeEach(() => {
    initializeDatabase(':memory:');
    const importRecord = ImportsDAL.create({
      filename: 'test.csv',
      status: 'pending'
    });
    importId = importRecord.id!;
  });

  afterEach(() => {
    const db = getDatabase();
    if (db) {
      closeDatabase(db);
    }
  });

  describe('create', () => {
    it('should create a new lead record', () => {
      const leadData = {
        import_id: importId,
        company: 'Test Company',
        contact_name: 'John Doe',
        email: 'john@test.com',
        title: 'CEO'
      };

      const result = LeadsDAL.create(leadData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.company).toBe('Test Company');
      expect(result.contact_name).toBe('John Doe');
      expect(result.email).toBe('john@test.com');
      expect(result.status).toBe('pending');
      expect(result.created_at).toBeDefined();
    });

    it('should create lead with minimal data', () => {
      const leadData = {
        import_id: importId
      };

      const result = LeadsDAL.create(leadData);

      expect(result).toBeDefined();
      expect(result.import_id).toBe(importId);
      expect(result.status).toBe('pending');
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple leads', () => {
      const bulkData: BulkLeadData = {
        import_id: importId,
        leads: [
          { company: 'Company 1', email: 'test1@example.com' },
          { company: 'Company 2', email: 'test2@example.com' },
          { company: 'Company 3', email: 'test3@example.com' }
        ]
      };

      const results = LeadsDAL.bulkCreate(bulkData);

      expect(results).toHaveLength(3);
      expect(results[0].company).toBe('Company 1');
      expect(results[1].company).toBe('Company 2');
      expect(results[2].company).toBe('Company 3');
    });
  });

  describe('getById', () => {
    it('should retrieve lead by id', () => {
      const created = LeadsDAL.create({
        import_id: importId,
        company: 'Test Company',
        email: 'test@example.com'
      });

      const retrieved = LeadsDAL.getById(created.id!);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.company).toBe('Test Company');
    });

    it('should return null for non-existent id', () => {
      const result = LeadsDAL.getById(999);
      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    beforeEach(() => {
      LeadsDAL.create({ import_id: importId, company: 'Company A', status: 'pending' });
      LeadsDAL.create({ import_id: importId, company: 'Company B', status: 'processed' });
      LeadsDAL.create({ import_id: importId, company: 'Company C', status: 'exported' });
    });

    it('should retrieve all leads', () => {
      const results = LeadsDAL.getAll();
      expect(results).toHaveLength(3);
    });

    it('should filter by import_id', () => {
      const results = LeadsDAL.getAll({ import_id: importId });
      expect(results).toHaveLength(3);
    });

    it('should filter by status', () => {
      const results = LeadsDAL.getAll({ status: 'pending' });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('pending');
    });

    it('should filter by company', () => {
      const results = LeadsDAL.getAll({ company: 'Company A' });
      expect(results).toHaveLength(1);
      expect(results[0].company).toBe('Company A');
    });

    it('should support pagination', () => {
      const results = LeadsDAL.getAll({}, { limit: 2 });
      expect(results).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update lead record', () => {
      const created = LeadsDAL.create({
        import_id: importId,
        company: 'Old Company',
        status: 'pending'
      });

      const updated = LeadsDAL.update(created.id!, {
        company: 'New Company',
        status: 'processed'
      });

      expect(updated).toBeDefined();
      expect(updated!.company).toBe('New Company');
      expect(updated!.status).toBe('processed');
    });

    it('should return null for non-existent id', () => {
      const result = LeadsDAL.update(999, { company: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update status only', () => {
      const created = LeadsDAL.create({
        import_id: importId,
        company: 'Test Company',
        status: 'pending'
      });

      const updated = LeadsDAL.updateStatus(created.id!, 'processed');

      expect(updated!.status).toBe('processed');
      expect(updated!.company).toBe('Test Company'); // Should remain unchanged
    });
  });

  describe('updateWoodpeckerCampaign', () => {
    it('should update woodpecker campaign info', () => {
      const created = LeadsDAL.create({
        import_id: importId,
        company: 'Test Company',
        status: 'pending'
      });

      const updated = LeadsDAL.updateWoodpeckerCampaign(created.id!, 'campaign-123');

      expect(updated!.woodpecker_campaign_id).toBe('campaign-123');
      expect(updated!.status).toBe('exported');
      expect(updated!.export_date).toBeDefined();
    });
  });

  describe('bulkUpdateStatus', () => {
    it('should update multiple leads status', () => {
      const lead1 = LeadsDAL.create({ import_id: importId, company: 'Company 1' });
      const lead2 = LeadsDAL.create({ import_id: importId, company: 'Company 2' });
      const lead3 = LeadsDAL.create({ import_id: importId, company: 'Company 3' });

      const updated = LeadsDAL.bulkUpdateStatus([lead1.id!, lead2.id!], 'processed');

      expect(updated).toBe(2);

      const updatedLead1 = LeadsDAL.getById(lead1.id!);
      const updatedLead2 = LeadsDAL.getById(lead2.id!);
      const unchangedLead3 = LeadsDAL.getById(lead3.id!);

      expect(updatedLead1!.status).toBe('processed');
      expect(updatedLead2!.status).toBe('processed');
      expect(unchangedLead3!.status).toBe('pending');
    });
  });

  describe('delete', () => {
    it('should delete lead record', () => {
      const created = LeadsDAL.create({
        import_id: importId,
        company: 'Test Company'
      });

      const deleted = LeadsDAL.delete(created.id!);
      expect(deleted).toBe(true);

      const retrieved = LeadsDAL.getById(created.id!);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent id', () => {
      const result = LeadsDAL.delete(999);
      expect(result).toBe(false);
    });
  });

  describe('deleteByImport', () => {
    it('should delete all leads for an import', () => {
      LeadsDAL.create({ import_id: importId, company: 'Company 1' });
      LeadsDAL.create({ import_id: importId, company: 'Company 2' });
      LeadsDAL.create({ import_id: importId, company: 'Company 3' });

      const deleted = LeadsDAL.deleteByImport(importId);
      expect(deleted).toBe(3);

      const remaining = LeadsDAL.getByImport(importId);
      expect(remaining).toHaveLength(0);
    });
  });

  describe('getCount', () => {
    beforeEach(() => {
      LeadsDAL.create({ import_id: importId, company: 'Company A', status: 'pending' });
      LeadsDAL.create({ import_id: importId, company: 'Company B', status: 'processed' });
      LeadsDAL.create({ import_id: importId, company: 'Company C', status: 'pending' });
    });

    it('should count all leads', () => {
      const count = LeadsDAL.getCount();
      expect(count).toBe(3);
    });

    it('should count filtered leads', () => {
      const count = LeadsDAL.getCount({ status: 'pending' });
      expect(count).toBe(2);
    });
  });

  describe('getByImport', () => {
    it('should get leads by import id', () => {
      LeadsDAL.create({ import_id: importId, company: 'Company 1' });
      LeadsDAL.create({ import_id: importId, company: 'Company 2' });

      const results = LeadsDAL.getByImport(importId);
      expect(results).toHaveLength(2);
    });
  });

  describe('getByStatus', () => {
    beforeEach(() => {
      LeadsDAL.create({ import_id: importId, company: 'Company A', status: 'pending' });
      LeadsDAL.create({ import_id: importId, company: 'Company B', status: 'pending' });
      LeadsDAL.create({ import_id: importId, company: 'Company C', status: 'processed' });
    });

    it('should get leads by status', () => {
      const results = LeadsDAL.getByStatus('pending');
      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.status).toBe('pending');
      });
    });
  });

  describe('searchByEmail', () => {
    beforeEach(() => {
      LeadsDAL.create({ import_id: importId, email: 'john@example.com' });
      LeadsDAL.create({ import_id: importId, email: 'jane@example.com' });
      LeadsDAL.create({ import_id: importId, email: 'bob@test.com' });
    });

    it('should search leads by email', () => {
      const results = LeadsDAL.searchByEmail('john');
      expect(results).toHaveLength(1);
      expect(results[0].email).toBe('john@example.com');
    });
  });

  describe('searchByCompany', () => {
    beforeEach(() => {
      LeadsDAL.create({ import_id: importId, company: 'Acme Corp' });
      LeadsDAL.create({ import_id: importId, company: 'Acme Industries' });
      LeadsDAL.create({ import_id: importId, company: 'Test Company' });
    });

    it('should search leads by company', () => {
      const results = LeadsDAL.searchByCompany('Acme');
      expect(results).toHaveLength(2);
    });
  });

  describe('getExportedLeads', () => {
    beforeEach(() => {
      LeadsDAL.create({ import_id: importId, status: 'exported', woodpecker_campaign_id: 'camp1' });
      LeadsDAL.create({ import_id: importId, status: 'exported', woodpecker_campaign_id: 'camp2' });
      LeadsDAL.create({ import_id: importId, status: 'pending' });
    });

    it('should get all exported leads', () => {
      const results = LeadsDAL.getExportedLeads();
      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.status).toBe('exported');
      });
    });

    it('should get exported leads by campaign', () => {
      const results = LeadsDAL.getExportedLeads('camp1');
      expect(results).toHaveLength(1);
      expect(results[0].woodpecker_campaign_id).toBe('camp1');
    });
  });

  describe('getLeadsWithAdditionalFields', () => {
    beforeEach(() => {
      LeadsDAL.create({ import_id: importId, company: 'Company 1', additional_fields: '{"phone": "123-456-7890"}' });
      LeadsDAL.create({ import_id: importId, company: 'Company 2' });
      LeadsDAL.create({ import_id: importId, company: 'Company 3', additional_fields: '{"website": "example.com"}' });
    });

    it('should get leads with additional fields', () => {
      const results = LeadsDAL.getLeadsWithAdditionalFields();
      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.additional_fields).toBeTruthy();
      });
    });
  });
});
