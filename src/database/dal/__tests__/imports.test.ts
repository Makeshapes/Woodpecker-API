import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ImportsDAL, ImportRecord } from '../imports';
import { initializeDatabase, closeDatabase } from '../../init';
import { getDatabase } from '../../init';

describe('ImportsDAL', () => {
  beforeEach(() => {
    initializeDatabase(':memory:');
  });

  afterEach(() => {
    const db = getDatabase();
    if (db) {
      closeDatabase(db);
    }
  });

  describe('create', () => {
    it('should create a new import record', () => {
      const importData = {
        filename: 'test.csv',
        status: 'pending' as const,
        lead_count: 0
      };

      const result = ImportsDAL.create(importData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.filename).toBe('test.csv');
      expect(result.status).toBe('pending');
      expect(result.lead_count).toBe(0);
      expect(result.created_at).toBeDefined();
    });

    it('should create import with default values', () => {
      const importData = {
        filename: 'test.csv',
        status: 'pending' as const
      };

      const result = ImportsDAL.create(importData);

      expect(result.lead_count).toBe(0);
      expect(result.import_date).toBeDefined();
    });
  });

  describe('getById', () => {
    it('should retrieve import by id', () => {
      const importData = {
        filename: 'test.csv',
        status: 'pending' as const
      };

      const created = ImportsDAL.create(importData);
      const retrieved = ImportsDAL.getById(created.id!);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.filename).toBe('test.csv');
    });

    it('should return null for non-existent id', () => {
      const result = ImportsDAL.getById(999);
      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    beforeEach(() => {
      ImportsDAL.create({ filename: 'test1.csv', status: 'pending' });
      ImportsDAL.create({ filename: 'test2.csv', status: 'completed' });
      ImportsDAL.create({ filename: 'test3.csv', status: 'failed' });
    });

    it('should retrieve all imports', () => {
      const results = ImportsDAL.getAll();
      expect(results).toHaveLength(3);
    });

    it('should filter by status', () => {
      const results = ImportsDAL.getAll({ status: 'pending' });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('pending');
    });

    it('should filter by filename', () => {
      const results = ImportsDAL.getAll({ filename: 'test1' });
      expect(results).toHaveLength(1);
      expect(results[0].filename).toBe('test1.csv');
    });

    it('should support pagination', () => {
      const results = ImportsDAL.getAll({}, { limit: 2 });
      expect(results).toHaveLength(2);
    });

    it('should support pagination with offset', () => {
      const results = ImportsDAL.getAll({}, { limit: 2, offset: 1 });
      expect(results).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update import record', () => {
      const created = ImportsDAL.create({
        filename: 'test.csv',
        status: 'pending'
      });

      const updated = ImportsDAL.update(created.id!, {
        status: 'completed',
        lead_count: 10
      });

      expect(updated).toBeDefined();
      expect(updated!.status).toBe('completed');
      expect(updated!.lead_count).toBe(10);
    });

    it('should return null for non-existent id', () => {
      const result = ImportsDAL.update(999, { status: 'completed' });
      expect(result).toBeNull();
    });

    it('should handle empty updates', () => {
      const created = ImportsDAL.create({
        filename: 'test.csv',
        status: 'pending'
      });

      const result = ImportsDAL.update(created.id!, {});
      expect(result).toEqual(created);
    });
  });

  describe('updateStatus', () => {
    it('should update status only', () => {
      const created = ImportsDAL.create({
        filename: 'test.csv',
        status: 'pending'
      });

      const updated = ImportsDAL.updateStatus(created.id!, 'completed');

      expect(updated!.status).toBe('completed');
    });

    it('should update status with error message', () => {
      const created = ImportsDAL.create({
        filename: 'test.csv',
        status: 'pending'
      });

      const updated = ImportsDAL.updateStatus(created.id!, 'failed', 'File not found');

      expect(updated!.status).toBe('failed');
      expect(updated!.error_messages).toBe('File not found');
    });
  });

  describe('updateLeadCount', () => {
    it('should update lead count', () => {
      const created = ImportsDAL.create({
        filename: 'test.csv',
        status: 'pending'
      });

      const updated = ImportsDAL.updateLeadCount(created.id!, 25);

      expect(updated!.lead_count).toBe(25);
    });
  });

  describe('delete', () => {
    it('should delete import record', () => {
      const created = ImportsDAL.create({
        filename: 'test.csv',
        status: 'pending'
      });

      const deleted = ImportsDAL.delete(created.id!);
      expect(deleted).toBe(true);

      const retrieved = ImportsDAL.getById(created.id!);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent id', () => {
      const result = ImportsDAL.delete(999);
      expect(result).toBe(false);
    });
  });

  describe('getCount', () => {
    beforeEach(() => {
      ImportsDAL.create({ filename: 'test1.csv', status: 'pending' });
      ImportsDAL.create({ filename: 'test2.csv', status: 'completed' });
      ImportsDAL.create({ filename: 'test3.csv', status: 'failed' });
    });

    it('should count all imports', () => {
      const count = ImportsDAL.getCount();
      expect(count).toBe(3);
    });

    it('should count filtered imports', () => {
      const count = ImportsDAL.getCount({ status: 'pending' });
      expect(count).toBe(1);
    });
  });

  describe('getByStatus', () => {
    beforeEach(() => {
      ImportsDAL.create({ filename: 'test1.csv', status: 'pending' });
      ImportsDAL.create({ filename: 'test2.csv', status: 'pending' });
      ImportsDAL.create({ filename: 'test3.csv', status: 'completed' });
    });

    it('should get imports by status', () => {
      const results = ImportsDAL.getByStatus('pending');
      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.status).toBe('pending');
      });
    });
  });

  describe('getRecent', () => {
    beforeEach(() => {
      ImportsDAL.create({ filename: 'test1.csv', status: 'pending' });
      ImportsDAL.create({ filename: 'test2.csv', status: 'completed' });
      ImportsDAL.create({ filename: 'test3.csv', status: 'failed' });
    });

    it('should get recent imports with default limit', () => {
      const results = ImportsDAL.getRecent();
      expect(results).toHaveLength(3);
    });

    it('should get recent imports with custom limit', () => {
      const results = ImportsDAL.getRecent(2);
      expect(results).toHaveLength(2);
    });
  });
});
