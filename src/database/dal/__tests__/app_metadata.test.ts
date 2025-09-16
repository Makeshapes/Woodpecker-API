import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AppMetadataDAL, AppMetadataRecord } from '../app_metadata';
import { initializeDatabase, closeDatabase } from '../../init';
import { getDatabase } from '../../init';

describe('AppMetadataDAL', () => {
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
    it('should create a new metadata record', () => {
      const result = AppMetadataDAL.create('test_key', 'test_value');

      expect(result).toBeDefined();
      expect(result.key).toBe('test_key');
      expect(result.value).toBe('test_value');
      expect(result.updated_at).toBeDefined();
    });

    it('should upsert existing key', () => {
      AppMetadataDAL.create('test_key', 'original_value');
      const updated = AppMetadataDAL.create('test_key', 'updated_value');

      expect(updated.value).toBe('updated_value');
      
      const all = AppMetadataDAL.getAll();
      expect(all).toHaveLength(1);
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple metadata records', () => {
      const metadata = {
        'key1': 'value1',
        'key2': 'value2',
        'key3': 'value3'
      };

      const results = AppMetadataDAL.bulkCreate(metadata);

      expect(results).toHaveLength(3);
      expect(results[0].key).toBe('key1');
      expect(results[1].key).toBe('key2');
      expect(results[2].key).toBe('key3');
    });

    it('should upsert existing keys in bulk', () => {
      AppMetadataDAL.create('existing_key', 'original_value');
      
      const metadata = {
        'existing_key': 'updated_value',
        'new_key': 'new_value'
      };

      const results = AppMetadataDAL.bulkCreate(metadata);

      expect(results).toHaveLength(2);
      expect(results[0].value).toBe('updated_value');
      
      const all = AppMetadataDAL.getAll();
      expect(all).toHaveLength(2);
    });
  });

  describe('getByKey', () => {
    it('should retrieve metadata by key', () => {
      AppMetadataDAL.create('test_key', 'test_value');
      
      const result = AppMetadataDAL.getByKey('test_key');

      expect(result).toBeDefined();
      expect(result!.key).toBe('test_key');
      expect(result!.value).toBe('test_value');
    });

    it('should return null for non-existent key', () => {
      const result = AppMetadataDAL.getByKey('non_existent');
      expect(result).toBeNull();
    });
  });

  describe('getValue', () => {
    it('should retrieve value by key', () => {
      AppMetadataDAL.create('test_key', 'test_value');
      
      const value = AppMetadataDAL.getValue('test_key');
      expect(value).toBe('test_value');
    });

    it('should return null for non-existent key', () => {
      const value = AppMetadataDAL.getValue('non_existent');
      expect(value).toBeNull();
    });
  });

  describe('getAll', () => {
    beforeEach(() => {
      AppMetadataDAL.create('key1', 'value1');
      AppMetadataDAL.create('key2', 'value2');
      AppMetadataDAL.create('key3', 'value3');
    });

    it('should retrieve all metadata', () => {
      const results = AppMetadataDAL.getAll();
      expect(results).toHaveLength(3);
    });

    it('should filter by key pattern', () => {
      const results = AppMetadataDAL.getAll({ keyPattern: 'key1' });
      expect(results).toHaveLength(1);
      expect(results[0].key).toBe('key1');
    });

    it('should filter by value pattern', () => {
      const results = AppMetadataDAL.getAll({ valuePattern: 'value2' });
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('value2');
    });

    it('should support pagination', () => {
      const results = AppMetadataDAL.getAll({}, { limit: 2 });
      expect(results).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update existing metadata', () => {
      AppMetadataDAL.create('test_key', 'original_value');
      
      const updated = AppMetadataDAL.update('test_key', 'updated_value');

      expect(updated).toBeDefined();
      expect(updated!.value).toBe('updated_value');
    });

    it('should create new metadata if key does not exist', () => {
      const result = AppMetadataDAL.update('new_key', 'new_value');

      expect(result).toBeDefined();
      expect(result!.key).toBe('new_key');
      expect(result!.value).toBe('new_value');
    });
  });

  describe('delete', () => {
    it('should delete metadata record', () => {
      AppMetadataDAL.create('test_key', 'test_value');
      
      const deleted = AppMetadataDAL.delete('test_key');
      expect(deleted).toBe(true);

      const retrieved = AppMetadataDAL.getByKey('test_key');
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent key', () => {
      const result = AppMetadataDAL.delete('non_existent');
      expect(result).toBe(false);
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple metadata records', () => {
      AppMetadataDAL.create('key1', 'value1');
      AppMetadataDAL.create('key2', 'value2');
      AppMetadataDAL.create('key3', 'value3');

      const deleted = AppMetadataDAL.bulkDelete(['key1', 'key2']);
      expect(deleted).toBe(2);

      const remaining = AppMetadataDAL.getAll();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].key).toBe('key3');
    });
  });

  describe('getCount', () => {
    beforeEach(() => {
      AppMetadataDAL.create('key1', 'value1');
      AppMetadataDAL.create('key2', 'value2');
      AppMetadataDAL.create('key3', 'value3');
    });

    it('should count all metadata', () => {
      const count = AppMetadataDAL.getCount();
      expect(count).toBe(3);
    });

    it('should count filtered metadata', () => {
      const count = AppMetadataDAL.getCount({ keyPattern: 'key1' });
      expect(count).toBe(1);
    });
  });

  describe('getByKeyPattern', () => {
    beforeEach(() => {
      AppMetadataDAL.create('config_setting1', 'value1');
      AppMetadataDAL.create('config_setting2', 'value2');
      AppMetadataDAL.create('other_key', 'value3');
    });

    it('should get metadata by key pattern', () => {
      const results = AppMetadataDAL.getByKeyPattern('config_');
      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.key).toContain('config_');
      });
    });
  });

  describe('getByValuePattern', () => {
    beforeEach(() => {
      AppMetadataDAL.create('key1', 'test_value1');
      AppMetadataDAL.create('key2', 'test_value2');
      AppMetadataDAL.create('key3', 'other_value');
    });

    it('should get metadata by value pattern', () => {
      const results = AppMetadataDAL.getByValuePattern('test_');
      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.value).toContain('test_');
      });
    });
  });

  describe('getAllAsObject', () => {
    beforeEach(() => {
      AppMetadataDAL.create('key1', 'value1');
      AppMetadataDAL.create('key2', 'value2');
      AppMetadataDAL.create('key3', 'value3');
    });

    it('should get all metadata as object', () => {
      const obj = AppMetadataDAL.getAllAsObject();
      
      expect(obj).toEqual({
        'key1': 'value1',
        'key2': 'value2',
        'key3': 'value3'
      });
    });
  });

  describe('configuration methods', () => {
    describe('getConfiguration and setConfiguration', () => {
      it('should set and get configuration', () => {
        const config = {
          'database_url': 'sqlite://test.db',
          'api_key': 'test-key',
          'timeout': '30000'
        };

        AppMetadataDAL.setConfiguration(config);
        const retrieved = AppMetadataDAL.getConfiguration();

        expect(retrieved).toEqual(config);
      });

      it('should store configuration with config_ prefix', () => {
        AppMetadataDAL.setConfiguration({ 'test_setting': 'test_value' });
        
        const record = AppMetadataDAL.getByKey('config_test_setting');
        expect(record).toBeDefined();
        expect(record!.value).toBe('test_value');
      });
    });

    describe('schema version methods', () => {
      it('should set and get schema version', () => {
        AppMetadataDAL.setSchemaVersion('2.0.0');
        const version = AppMetadataDAL.getSchemaVersion();
        expect(version).toBe('2.0.0');
      });
    });

    describe('migration methods', () => {
      it('should set and get last migration', () => {
        AppMetadataDAL.setLastMigration('migration_001');
        const migration = AppMetadataDAL.getLastMigration();
        expect(migration).toBe('migration_001');
      });
    });

    describe('app version methods', () => {
      it('should set and get app version', () => {
        AppMetadataDAL.setAppVersion('1.5.0');
        const version = AppMetadataDAL.getAppVersion();
        expect(version).toBe('1.5.0');
      });
    });

    describe('installation ID methods', () => {
      it('should set and get installation ID', () => {
        AppMetadataDAL.setInstallationId('install-123');
        const id = AppMetadataDAL.getInstallationId();
        expect(id).toBe('install-123');
      });
    });

    describe('created at methods', () => {
      it('should set and get created at timestamp', () => {
        const timestamp = new Date().toISOString();
        AppMetadataDAL.setCreatedAt(timestamp);
        const retrieved = AppMetadataDAL.getCreatedAt();
        expect(retrieved).toBe(timestamp);
      });
    });

    describe('backup methods', () => {
      it('should set and get last backup timestamp', () => {
        const timestamp = new Date().toISOString();
        AppMetadataDAL.setLastBackup(timestamp);
        const retrieved = AppMetadataDAL.getLastBackup();
        expect(retrieved).toBe(timestamp);
      });
    });
  });

  describe('feature flag methods', () => {
    describe('getFeatureFlags and setFeatureFlags', () => {
      it('should set and get feature flags', () => {
        const flags = {
          'dark_mode': true,
          'beta_features': false,
          'analytics': true
        };

        AppMetadataDAL.setFeatureFlags(flags);
        const retrieved = AppMetadataDAL.getFeatureFlags();

        expect(retrieved).toEqual(flags);
      });

      it('should store feature flags with feature_ prefix', () => {
        AppMetadataDAL.setFeatureFlag('test_feature', true);
        
        const record = AppMetadataDAL.getByKey('feature_test_feature');
        expect(record).toBeDefined();
        expect(record!.value).toBe('true');
      });
    });

    describe('setFeatureFlag', () => {
      it('should set individual feature flag', () => {
        AppMetadataDAL.setFeatureFlag('new_ui', true);
        const flags = AppMetadataDAL.getFeatureFlags();
        expect(flags['new_ui']).toBe(true);
      });
    });
  });

  describe('user preference methods', () => {
    describe('getUserPreferences and setUserPreferences', () => {
      it('should set and get user preferences', () => {
        const prefs = {
          'theme': 'dark',
          'language': 'en',
          'notifications': 'enabled'
        };

        AppMetadataDAL.setUserPreferences(prefs);
        const retrieved = AppMetadataDAL.getUserPreferences();

        expect(retrieved).toEqual(prefs);
      });

      it('should store preferences with pref_ prefix', () => {
        AppMetadataDAL.setUserPreference('test_pref', 'test_value');
        
        const record = AppMetadataDAL.getByKey('pref_test_pref');
        expect(record).toBeDefined();
        expect(record!.value).toBe('test_value');
      });
    });

    describe('setUserPreference', () => {
      it('should set individual user preference', () => {
        AppMetadataDAL.setUserPreference('sidebar_width', '300px');
        const prefs = AppMetadataDAL.getUserPreferences();
        expect(prefs['sidebar_width']).toBe('300px');
      });
    });
  });

  describe('statistics methods', () => {
    describe('getStats and setStat', () => {
      it('should set and get statistics', () => {
        AppMetadataDAL.setStat('total_imports', 150);
        AppMetadataDAL.setStat('total_leads', 5000);
        
        const stats = AppMetadataDAL.getStats();
        expect(stats['total_imports']).toBe('150');
        expect(stats['total_leads']).toBe('5000');
      });

      it('should store stats with stat_ prefix', () => {
        AppMetadataDAL.setStat('test_stat', 'test_value');
        
        const record = AppMetadataDAL.getByKey('stat_test_stat');
        expect(record).toBeDefined();
        expect(record!.value).toBe('test_value');
      });
    });

    describe('incrementStat', () => {
      it('should increment existing stat', () => {
        AppMetadataDAL.setStat('counter', 10);
        AppMetadataDAL.incrementStat('counter', 5);
        
        const value = AppMetadataDAL.getValue('stat_counter');
        expect(value).toBe('15');
      });

      it('should create new stat if not exists', () => {
        AppMetadataDAL.incrementStat('new_counter', 3);
        
        const value = AppMetadataDAL.getValue('stat_new_counter');
        expect(value).toBe('3');
      });

      it('should increment by 1 by default', () => {
        AppMetadataDAL.setStat('default_counter', 5);
        AppMetadataDAL.incrementStat('default_counter');
        
        const value = AppMetadataDAL.getValue('stat_default_counter');
        expect(value).toBe('6');
      });
    });
  });

  describe('clearByPrefix', () => {
    beforeEach(() => {
      AppMetadataDAL.create('config_setting1', 'value1');
      AppMetadataDAL.create('config_setting2', 'value2');
      AppMetadataDAL.create('feature_flag1', 'true');
      AppMetadataDAL.create('other_key', 'value');
    });

    it('should clear metadata by prefix', () => {
      const cleared = AppMetadataDAL.clearByPrefix('config_');
      expect(cleared).toBe(2);

      const remaining = AppMetadataDAL.getAll();
      expect(remaining).toHaveLength(2);
      expect(remaining.find(r => r.key.startsWith('config_'))).toBeUndefined();
    });
  });

  describe('backup and restore', () => {
    beforeEach(() => {
      AppMetadataDAL.create('key1', 'value1');
      AppMetadataDAL.create('key2', 'value2');
      AppMetadataDAL.create('key3', 'value3');
    });

    describe('backup', () => {
      it('should create backup and set last backup timestamp', () => {
        const backup = AppMetadataDAL.backup();
        
        expect(backup).toHaveLength(4); // 3 original + 1 last_backup
        expect(backup.find(r => r.key === 'key1')).toBeDefined();
        expect(backup.find(r => r.key === 'key2')).toBeDefined();
        expect(backup.find(r => r.key === 'key3')).toBeDefined();
        expect(backup.find(r => r.key === 'last_backup')).toBeDefined();
      });
    });

    describe('restore', () => {
      it('should restore from backup', () => {
        const originalBackup = AppMetadataDAL.backup();
        
        // Modify data
        AppMetadataDAL.create('new_key', 'new_value');
        AppMetadataDAL.delete('key1');
        
        // Restore
        const restored = AppMetadataDAL.restore(originalBackup);
        expect(restored).toBe(originalBackup.length);
        
        // Verify restoration
        const current = AppMetadataDAL.getAll();
        expect(current).toHaveLength(originalBackup.length);
        expect(AppMetadataDAL.getByKey('key1')).toBeDefined();
        expect(AppMetadataDAL.getByKey('new_key')).toBeNull();
      });
    });
  });
});
