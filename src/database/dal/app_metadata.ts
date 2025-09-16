import Database from 'better-sqlite3';
import { withDatabase, withTransaction } from '../utils';

export interface AppMetadataRecord {
  key: string;
  value: string;
  updated_at?: string;
}

export interface MetadataFilters {
  keyPattern?: string;
  valuePattern?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export class AppMetadataDAL {
  static create(key: string, value: string): AppMetadataRecord {
    return withDatabase(db => {
      const stmt = db.prepare(`
        INSERT INTO app_metadata (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET 
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `);
      
      stmt.run(key, value);
      return this.getByKey(key)!;
    });
  }

  static bulkCreate(metadata: Record<string, string>): AppMetadataRecord[] {
    return withTransaction(db => {
      const stmt = db.prepare(`
        INSERT INTO app_metadata (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET 
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `);
      
      const results: AppMetadataRecord[] = [];
      
      for (const [key, value] of Object.entries(metadata)) {
        stmt.run(key, value);
        const created = this.getByKey(key);
        if (created) results.push(created);
      }
      
      return results;
    });
  }

  static getByKey(key: string): AppMetadataRecord | null {
    return withDatabase(db => {
      const stmt = db.prepare('SELECT * FROM app_metadata WHERE key = ?');
      return stmt.get(key) as AppMetadataRecord | undefined || null;
    });
  }

  static getValue(key: string): string | null {
    const record = this.getByKey(key);
    return record?.value || null;
  }

  static getAll(filters?: MetadataFilters, pagination?: PaginationOptions): AppMetadataRecord[] {
    return withDatabase(db => {
      let query = 'SELECT * FROM app_metadata WHERE 1=1';
      const params: any[] = [];
      
      if (filters?.keyPattern) {
        query += ' AND key LIKE ?';
        params.push(`%${filters.keyPattern}%`);
      }
      
      if (filters?.valuePattern) {
        query += ' AND value LIKE ?';
        params.push(`%${filters.valuePattern}%`);
      }
      
      if (filters?.dateFrom) {
        query += ' AND updated_at >= ?';
        params.push(filters.dateFrom);
      }
      
      if (filters?.dateTo) {
        query += ' AND updated_at <= ?';
        params.push(filters.dateTo);
      }
      
      query += ' ORDER BY updated_at DESC';
      
      if (pagination?.limit) {
        query += ' LIMIT ?';
        params.push(pagination.limit);
        
        if (pagination?.offset) {
          query += ' OFFSET ?';
          params.push(pagination.offset);
        }
      }
      
      const stmt = db.prepare(query);
      return stmt.all(...params) as AppMetadataRecord[];
    });
  }

  static update(key: string, value: string): AppMetadataRecord | null {
    return this.create(key, value); // Uses UPSERT logic
  }

  static delete(key: string): boolean {
    return withDatabase(db => {
      const stmt = db.prepare('DELETE FROM app_metadata WHERE key = ?');
      const result = stmt.run(key);
      return result.changes > 0;
    });
  }

  static bulkDelete(keys: string[]): number {
    return withTransaction(db => {
      const placeholders = keys.map(() => '?').join(',');
      const stmt = db.prepare(`DELETE FROM app_metadata WHERE key IN (${placeholders})`);
      const result = stmt.run(...keys);
      return result.changes;
    });
  }

  static getCount(filters?: MetadataFilters): number {
    return withDatabase(db => {
      let query = 'SELECT COUNT(*) as count FROM app_metadata WHERE 1=1';
      const params: any[] = [];
      
      if (filters?.keyPattern) {
        query += ' AND key LIKE ?';
        params.push(`%${filters.keyPattern}%`);
      }
      
      if (filters?.valuePattern) {
        query += ' AND value LIKE ?';
        params.push(`%${filters.valuePattern}%`);
      }
      
      if (filters?.dateFrom) {
        query += ' AND updated_at >= ?';
        params.push(filters.dateFrom);
      }
      
      if (filters?.dateTo) {
        query += ' AND updated_at <= ?';
        params.push(filters.dateTo);
      }
      
      const stmt = db.prepare(query);
      const result = stmt.get(...params) as { count: number };
      return result.count;
    });
  }

  static getByKeyPattern(pattern: string): AppMetadataRecord[] {
    return this.getAll({ keyPattern: pattern });
  }

  static getByValuePattern(pattern: string): AppMetadataRecord[] {
    return this.getAll({ valuePattern: pattern });
  }

  static getAllAsObject(): Record<string, string> {
    return withDatabase(db => {
      const stmt = db.prepare('SELECT key, value FROM app_metadata');
      const results = stmt.all() as { key: string; value: string }[];
      
      return results.reduce((obj, row) => {
        obj[row.key] = row.value;
        return obj;
      }, {} as Record<string, string>);
    });
  }

  static getConfiguration(): Record<string, string> {
    return this.getByKeyPattern('config_').reduce((config, record) => {
      const configKey = record.key.replace('config_', '');
      config[configKey] = record.value;
      return config;
    }, {} as Record<string, string>);
  }

  static setConfiguration(config: Record<string, string>): AppMetadataRecord[] {
    const prefixedConfig = Object.entries(config).reduce((acc, [key, value]) => {
      acc[`config_${key}`] = value;
      return acc;
    }, {} as Record<string, string>);
    
    return this.bulkCreate(prefixedConfig);
  }

  static getSchemaVersion(): string | null {
    return this.getValue('schema_version');
  }

  static setSchemaVersion(version: string): AppMetadataRecord {
    return this.create('schema_version', version);
  }

  static getLastMigration(): string | null {
    return this.getValue('last_migration');
  }

  static setLastMigration(migration: string): AppMetadataRecord {
    return this.create('last_migration', migration);
  }

  static getAppVersion(): string | null {
    return this.getValue('app_version');
  }

  static setAppVersion(version: string): AppMetadataRecord {
    return this.create('app_version', version);
  }

  static getInstallationId(): string | null {
    return this.getValue('installation_id');
  }

  static setInstallationId(id: string): AppMetadataRecord {
    return this.create('installation_id', id);
  }

  static getCreatedAt(): string | null {
    return this.getValue('created_at');
  }

  static setCreatedAt(timestamp: string): AppMetadataRecord {
    return this.create('created_at', timestamp);
  }

  static getLastBackup(): string | null {
    return this.getValue('last_backup');
  }

  static setLastBackup(timestamp: string): AppMetadataRecord {
    return this.create('last_backup', timestamp);
  }

  static getFeatureFlags(): Record<string, boolean> {
    const flags = this.getByKeyPattern('feature_');
    return flags.reduce((features, record) => {
      const featureName = record.key.replace('feature_', '');
      features[featureName] = record.value.toLowerCase() === 'true';
      return features;
    }, {} as Record<string, boolean>);
  }

  static setFeatureFlag(feature: string, enabled: boolean): AppMetadataRecord {
    return this.create(`feature_${feature}`, enabled.toString());
  }

  static setFeatureFlags(flags: Record<string, boolean>): AppMetadataRecord[] {
    const prefixedFlags = Object.entries(flags).reduce((acc, [key, value]) => {
      acc[`feature_${key}`] = value.toString();
      return acc;
    }, {} as Record<string, string>);
    
    return this.bulkCreate(prefixedFlags);
  }

  static getUserPreferences(): Record<string, string> {
    const prefs = this.getByKeyPattern('pref_');
    return prefs.reduce((preferences, record) => {
      const prefName = record.key.replace('pref_', '');
      preferences[prefName] = record.value;
      return preferences;
    }, {} as Record<string, string>);
  }

  static setUserPreference(preference: string, value: string): AppMetadataRecord {
    return this.create(`pref_${preference}`, value);
  }

  static setUserPreferences(preferences: Record<string, string>): AppMetadataRecord[] {
    const prefixedPrefs = Object.entries(preferences).reduce((acc, [key, value]) => {
      acc[`pref_${key}`] = value;
      return acc;
    }, {} as Record<string, string>);
    
    return this.bulkCreate(prefixedPrefs);
  }

  static getStats(): Record<string, string> {
    const stats = this.getByKeyPattern('stat_');
    return stats.reduce((statistics, record) => {
      const statName = record.key.replace('stat_', '');
      statistics[statName] = record.value;
      return statistics;
    }, {} as Record<string, string>);
  }

  static setStat(stat: string, value: string | number): AppMetadataRecord {
    return this.create(`stat_${stat}`, value.toString());
  }

  static incrementStat(stat: string, increment: number = 1): AppMetadataRecord {
    const currentValue = this.getValue(`stat_${stat}`);
    const newValue = (parseInt(currentValue || '0', 10) + increment).toString();
    return this.create(`stat_${stat}`, newValue);
  }

  static clearByPrefix(prefix: string): number {
    return withTransaction(db => {
      const stmt = db.prepare('DELETE FROM app_metadata WHERE key LIKE ?');
      const result = stmt.run(`${prefix}%`);
      return result.changes;
    });
  }

  static backup(): AppMetadataRecord[] {
    this.setLastBackup(new Date().toISOString());
    return this.getAll();
  }

  static restore(backup: AppMetadataRecord[]): number {
    return withTransaction(db => {
      // Clear existing metadata
      db.prepare('DELETE FROM app_metadata').run();
      
      // Restore from backup
      const stmt = db.prepare(`
        INSERT INTO app_metadata (key, value, updated_at)
        VALUES (?, ?, ?)
      `);
      
      let restored = 0;
      for (const record of backup) {
        stmt.run(record.key, record.value, record.updated_at || new Date().toISOString());
        restored++;
      }
      
      return restored;
    });
  }
}
