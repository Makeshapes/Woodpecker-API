import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MappingsDAL, MappingRecord, BulkMappingData } from '../mappings';
import { ImportsDAL } from '../imports';
import { initializeDatabase, closeDatabase } from '../../init';
import { getDatabase } from '../../init';

describe('MappingsDAL', () => {
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
    it('should create a new mapping record', () => {
      const mappingData = {
        import_id: importId,
        csv_column: 'Company Name',
        woodpecker_field: 'company',
        mapping_type: 'direct' as const
      };

      const result = MappingsDAL.create(mappingData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.import_id).toBe(importId);
      expect(result.csv_column).toBe('Company Name');
      expect(result.woodpecker_field).toBe('company');
      expect(result.mapping_type).toBe('direct');
      expect(result.is_active).toBe(true);
      expect(result.created_at).toBeDefined();
    });

    it('should create mapping with default values', () => {
      const mappingData = {
        import_id: importId,
        csv_column: 'Email',
        woodpecker_field: 'email'
      };

      const result = MappingsDAL.create(mappingData);

      expect(result.mapping_type).toBe('direct');
      expect(result.is_active).toBe(true);
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple mappings', () => {
      const bulkData: BulkMappingData = {
        import_id: importId,
        mappings: [
          { csv_column: 'Company', woodpecker_field: 'company' },
          { csv_column: 'Email', woodpecker_field: 'email' },
          { csv_column: 'First Name', woodpecker_field: 'first_name' }
        ]
      };

      const results = MappingsDAL.bulkCreate(bulkData);

      expect(results).toHaveLength(3);
      expect(results[0].csv_column).toBe('Company');
      expect(results[1].csv_column).toBe('Email');
      expect(results[2].csv_column).toBe('First Name');
    });
  });

  describe('getById', () => {
    it('should retrieve mapping by id', () => {
      const created = MappingsDAL.create({
        import_id: importId,
        csv_column: 'Company',
        woodpecker_field: 'company'
      });

      const retrieved = MappingsDAL.getById(created.id!);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.csv_column).toBe('Company');
    });

    it('should return null for non-existent id', () => {
      const result = MappingsDAL.getById(999);
      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    beforeEach(() => {
      MappingsDAL.create({
        import_id: importId,
        csv_column: 'Company',
        woodpecker_field: 'company',
        mapping_type: 'direct',
        is_active: true
      });
      MappingsDAL.create({
        import_id: importId,
        csv_column: 'Email',
        woodpecker_field: 'email',
        mapping_type: 'direct',
        is_active: false
      });
      MappingsDAL.create({
        import_id: importId,
        csv_column: 'Phone',
        woodpecker_field: 'phone',
        mapping_type: 'computed',
        is_active: true
      });
    });

    it('should retrieve all mappings', () => {
      const results = MappingsDAL.getAll();
      expect(results).toHaveLength(3);
    });

    it('should filter by import_id', () => {
      const results = MappingsDAL.getAll({ import_id: importId });
      expect(results).toHaveLength(3);
    });

    it('should filter by csv_column', () => {
      const results = MappingsDAL.getAll({ csv_column: 'Company' });
      expect(results).toHaveLength(1);
      expect(results[0].csv_column).toBe('Company');
    });

    it('should filter by woodpecker_field', () => {
      const results = MappingsDAL.getAll({ woodpecker_field: 'email' });
      expect(results).toHaveLength(1);
      expect(results[0].woodpecker_field).toBe('email');
    });

    it('should filter by mapping_type', () => {
      const results = MappingsDAL.getAll({ mapping_type: 'direct' });
      expect(results).toHaveLength(2);
    });

    it('should filter by is_active', () => {
      const results = MappingsDAL.getAll({ is_active: true });
      expect(results).toHaveLength(2);
    });

    it('should support pagination', () => {
      const results = MappingsDAL.getAll({}, { limit: 2 });
      expect(results).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update mapping record', () => {
      const created = MappingsDAL.create({
        import_id: importId,
        csv_column: 'Company',
        woodpecker_field: 'company',
        is_active: true
      });

      const updated = MappingsDAL.update(created.id!, {
        woodpecker_field: 'company_name',
        is_active: false
      });

      expect(updated).toBeDefined();
      expect(updated!.woodpecker_field).toBe('company_name');
      expect(updated!.is_active).toBe(false);
    });

    it('should return null for non-existent id', () => {
      const result = MappingsDAL.update(999, { is_active: false });
      expect(result).toBeNull();
    });
  });

  describe('updateActiveStatus', () => {
    it('should update active status only', () => {
      const created = MappingsDAL.create({
        import_id: importId,
        csv_column: 'Company',
        woodpecker_field: 'company',
        is_active: true
      });

      const updated = MappingsDAL.updateActiveStatus(created.id!, false);

      expect(updated!.is_active).toBe(false);
      expect(updated!.csv_column).toBe('Company'); // Should remain unchanged
    });
  });

  describe('updateMappingType', () => {
    it('should update mapping type only', () => {
      const created = MappingsDAL.create({
        import_id: importId,
        csv_column: 'Company',
        woodpecker_field: 'company',
        mapping_type: 'direct'
      });

      const updated = MappingsDAL.updateMappingType(created.id!, 'computed');

      expect(updated!.mapping_type).toBe('computed');
    });
  });

  describe('bulkUpdateActiveStatus', () => {
    it('should update multiple mappings active status', () => {
      const mapping1 = MappingsDAL.create({
        import_id: importId,
        csv_column: 'Company',
        woodpecker_field: 'company'
      });
      const mapping2 = MappingsDAL.create({
        import_id: importId,
        csv_column: 'Email',
        woodpecker_field: 'email'
      });
      const mapping3 = MappingsDAL.create({
        import_id: importId,
        csv_column: 'Phone',
        woodpecker_field: 'phone'
      });

      const updated = MappingsDAL.bulkUpdateActiveStatus([mapping1.id!, mapping2.id!], false);

      expect(updated).toBe(2);

      const updatedMapping1 = MappingsDAL.getById(mapping1.id!);
      const updatedMapping2 = MappingsDAL.getById(mapping2.id!);
      const unchangedMapping3 = MappingsDAL.getById(mapping3.id!);

      expect(updatedMapping1!.is_active).toBe(false);
      expect(updatedMapping2!.is_active).toBe(false);
      expect(unchangedMapping3!.is_active).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete mapping record', () => {
      const created = MappingsDAL.create({
        import_id: importId,
        csv_column: 'Company',
        woodpecker_field: 'company'
      });

      const deleted = MappingsDAL.delete(created.id!);
      expect(deleted).toBe(true);

      const retrieved = MappingsDAL.getById(created.id!);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent id', () => {
      const result = MappingsDAL.delete(999);
      expect(result).toBe(false);
    });
  });

  describe('deleteByImport', () => {
    it('should delete all mappings for an import', () => {
      MappingsDAL.create({ import_id: importId, csv_column: 'Company', woodpecker_field: 'company' });
      MappingsDAL.create({ import_id: importId, csv_column: 'Email', woodpecker_field: 'email' });
      MappingsDAL.create({ import_id: importId, csv_column: 'Phone', woodpecker_field: 'phone' });

      const deleted = MappingsDAL.deleteByImport(importId);
      expect(deleted).toBe(3);

      const remaining = MappingsDAL.getByImport(importId, false);
      expect(remaining).toHaveLength(0);
    });
  });

  describe('deactivateByImport', () => {
    it('should deactivate all mappings for an import', () => {
      MappingsDAL.create({ import_id: importId, csv_column: 'Company', woodpecker_field: 'company' });
      MappingsDAL.create({ import_id: importId, csv_column: 'Email', woodpecker_field: 'email' });

      const deactivated = MappingsDAL.deactivateByImport(importId);
      expect(deactivated).toBe(2);

      const activeMappings = MappingsDAL.getByImport(importId, true);
      expect(activeMappings).toHaveLength(0);

      const allMappings = MappingsDAL.getByImport(importId, false);
      expect(allMappings).toHaveLength(2);
      allMappings.forEach(mapping => {
        expect(mapping.is_active).toBe(false);
      });
    });
  });

  describe('getCount', () => {
    beforeEach(() => {
      MappingsDAL.create({ import_id: importId, csv_column: 'Company', woodpecker_field: 'company', is_active: true });
      MappingsDAL.create({ import_id: importId, csv_column: 'Email', woodpecker_field: 'email', is_active: false });
      MappingsDAL.create({ import_id: importId, csv_column: 'Phone', woodpecker_field: 'phone', is_active: true });
    });

    it('should count all mappings', () => {
      const count = MappingsDAL.getCount();
      expect(count).toBe(3);
    });

    it('should count filtered mappings', () => {
      const count = MappingsDAL.getCount({ is_active: true });
      expect(count).toBe(2);
    });
  });

  describe('getByImport', () => {
    beforeEach(() => {
      MappingsDAL.create({ import_id: importId, csv_column: 'Company', woodpecker_field: 'company', is_active: true });
      MappingsDAL.create({ import_id: importId, csv_column: 'Email', woodpecker_field: 'email', is_active: false });
    });

    it('should get active mappings by import id', () => {
      const results = MappingsDAL.getByImport(importId, true);
      expect(results).toHaveLength(1);
      expect(results[0].is_active).toBe(true);
    });

    it('should get all mappings by import id', () => {
      const results = MappingsDAL.getByImport(importId, false);
      expect(results).toHaveLength(2);
    });
  });

  describe('getActiveMappings', () => {
    beforeEach(() => {
      MappingsDAL.create({ import_id: importId, csv_column: 'Company', woodpecker_field: 'company', is_active: true });
      MappingsDAL.create({ import_id: importId, csv_column: 'Email', woodpecker_field: 'email', is_active: false });
      MappingsDAL.create({ import_id: importId, csv_column: 'Phone', woodpecker_field: 'phone', is_active: true });
    });

    it('should get all active mappings', () => {
      const results = MappingsDAL.getActiveMappings();
      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.is_active).toBe(true);
      });
    });

    it('should get active mappings for specific import', () => {
      const results = MappingsDAL.getActiveMappings(importId);
      expect(results).toHaveLength(2);
    });
  });

  describe('getByMappingType', () => {
    beforeEach(() => {
      MappingsDAL.create({ import_id: importId, csv_column: 'Company', woodpecker_field: 'company', mapping_type: 'direct' });
      MappingsDAL.create({ import_id: importId, csv_column: 'Email', woodpecker_field: 'email', mapping_type: 'direct' });
      MappingsDAL.create({ import_id: importId, csv_column: 'Phone', woodpecker_field: 'phone', mapping_type: 'computed' });
    });

    it('should get mappings by type', () => {
      const results = MappingsDAL.getByMappingType('direct');
      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.mapping_type).toBe('direct');
      });
    });
  });

  describe('getByWoodpeckerField', () => {
    beforeEach(() => {
      MappingsDAL.create({ import_id: importId, csv_column: 'Company Name', woodpecker_field: 'company' });
      MappingsDAL.create({ import_id: importId, csv_column: 'Company', woodpecker_field: 'company' });
      MappingsDAL.create({ import_id: importId, csv_column: 'Email', woodpecker_field: 'email' });
    });

    it('should get mappings by woodpecker field', () => {
      const results = MappingsDAL.getByWoodpeckerField('company');
      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.woodpecker_field).toBe('company');
      });
    });
  });

  describe('searchByCsvColumn', () => {
    beforeEach(() => {
      MappingsDAL.create({ import_id: importId, csv_column: 'Company Name', woodpecker_field: 'company' });
      MappingsDAL.create({ import_id: importId, csv_column: 'Company Size', woodpecker_field: 'company_size' });
      MappingsDAL.create({ import_id: importId, csv_column: 'Email', woodpecker_field: 'email' });
    });

    it('should search mappings by CSV column', () => {
      const results = MappingsDAL.searchByCsvColumn('Company');
      expect(results).toHaveLength(2);
    });
  });

  describe('getMappingConfiguration', () => {
    beforeEach(() => {
      MappingsDAL.create({ import_id: importId, csv_column: 'Company', woodpecker_field: 'company', is_active: true });
      MappingsDAL.create({ import_id: importId, csv_column: 'Email', woodpecker_field: 'email', is_active: true });
      MappingsDAL.create({ import_id: importId, csv_column: 'Phone', woodpecker_field: 'phone', is_active: false });
    });

    it('should get mapping configuration as object', () => {
      const config = MappingsDAL.getMappingConfiguration(importId);
      
      expect(config).toEqual({
        'Company': 'company',
        'Email': 'email'
      });
      expect(config['Phone']).toBeUndefined(); // Inactive mapping should not be included
    });
  });

  describe('getWoodpeckerFieldUsage', () => {
    beforeEach(() => {
      MappingsDAL.create({ import_id: importId, csv_column: 'Company1', woodpecker_field: 'company', is_active: true });
      MappingsDAL.create({ import_id: importId, csv_column: 'Company2', woodpecker_field: 'company', is_active: true });
      MappingsDAL.create({ import_id: importId, csv_column: 'Email', woodpecker_field: 'email', is_active: true });
      MappingsDAL.create({ import_id: importId, csv_column: 'Phone', woodpecker_field: 'phone', is_active: false });
    });

    it('should get woodpecker field usage statistics', () => {
      const usage = MappingsDAL.getWoodpeckerFieldUsage();
      
      expect(usage['company']).toBe(2);
      expect(usage['email']).toBe(1);
      expect(usage['phone']).toBeUndefined(); // Inactive mapping should not be counted
    });
  });

  describe('getMappingStats', () => {
    beforeEach(() => {
      MappingsDAL.create({ import_id: importId, csv_column: 'Company', woodpecker_field: 'company', mapping_type: 'direct', is_active: true });
      MappingsDAL.create({ import_id: importId, csv_column: 'Email', woodpecker_field: 'email', mapping_type: 'direct', is_active: false });
      MappingsDAL.create({ import_id: importId, csv_column: 'Phone', woodpecker_field: 'phone', mapping_type: 'computed', is_active: true });
    });

    it('should get mapping statistics', () => {
      const stats = MappingsDAL.getMappingStats();
      
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.byType.direct).toBe(2);
      expect(stats.byType.computed).toBe(1);
    });
  });

  describe('duplicateImportMappings', () => {
    it('should duplicate mappings from one import to another', () => {
      // Create source mappings
      MappingsDAL.create({ import_id: importId, csv_column: 'Company', woodpecker_field: 'company', is_active: true });
      MappingsDAL.create({ import_id: importId, csv_column: 'Email', woodpecker_field: 'email', is_active: true });

      // Create target import
      const targetImport = ImportsDAL.create({ filename: 'target.csv', status: 'pending' });
      const targetImportId = targetImport.id!;

      const duplicated = MappingsDAL.duplicateImportMappings(importId, targetImportId);

      expect(duplicated).toHaveLength(2);
      expect(duplicated[0].import_id).toBe(targetImportId);
      expect(duplicated[1].import_id).toBe(targetImportId);

      const targetMappings = MappingsDAL.getByImport(targetImportId);
      expect(targetMappings).toHaveLength(2);
    });
  });

  describe('validateMappingConfiguration', () => {
    it('should validate valid mapping configuration', () => {
      MappingsDAL.create({ import_id: importId, csv_column: 'Company', woodpecker_field: 'company', is_active: true });
      MappingsDAL.create({ import_id: importId, csv_column: 'Email', woodpecker_field: 'email', is_active: true });

      const validation = MappingsDAL.validateMappingConfiguration(importId);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect no active mappings', () => {
      const validation = MappingsDAL.validateMappingConfiguration(importId);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('No active mappings found for import');
    });

    it('should detect duplicate CSV column mappings', () => {
      MappingsDAL.create({ import_id: importId, csv_column: 'Company', woodpecker_field: 'company', is_active: true });
      MappingsDAL.create({ import_id: importId, csv_column: 'Company', woodpecker_field: 'company_name', is_active: true });

      const validation = MappingsDAL.validateMappingConfiguration(importId);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Duplicate CSV column mapping: Company');
    });

    it('should detect duplicate Woodpecker field mappings', () => {
      MappingsDAL.create({ import_id: importId, csv_column: 'Company1', woodpecker_field: 'company', is_active: true });
      MappingsDAL.create({ import_id: importId, csv_column: 'Company2', woodpecker_field: 'company', is_active: true });

      const validation = MappingsDAL.validateMappingConfiguration(importId);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Duplicate Woodpecker field mapping: company');
    });
  });
});
