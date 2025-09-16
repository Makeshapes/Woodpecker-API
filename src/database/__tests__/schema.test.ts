import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { CREATE_TABLES_SQL, CREATE_INDEXES_SQL, INITIAL_METADATA } from '../schema';
import { initializeDatabase, closeDatabase } from '../init';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-app-data')
  }
}));

describe('Database Schema', () => {
  const testDbPath = path.join('/tmp', `test-schema-leads-${Date.now()}.db`);
  let db: Database.Database;
  
  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // Mock getDatabasePath to return test path
    const initModule = await import('../init');
    vi.spyOn(initModule, 'getDatabasePath').mockReturnValue(testDbPath);
    
    // Initialize test database
    db = initializeDatabase();
  });
  
  afterEach(() => {
    closeDatabase(db);
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    vi.restoreAllMocks();
  });
  
  describe('Table Creation', () => {
    it('should create imports table with correct schema', () => {
      const tableInfo = db.prepare('PRAGMA table_info(imports)').all();
      const columnNames = tableInfo.map((col: any) => col.name);
      
      expect(columnNames).toEqual(
        expect.arrayContaining([
          'id', 'filename', 'import_date', 'status', 'lead_count', 'error_messages', 'created_at'
        ])
      );
      
      // Check primary key
      const pkColumn = tableInfo.find((col: any) => col.pk === 1);
      expect(pkColumn?.name).toBe('id');
    });
    
    it('should create leads table with correct schema and foreign key', () => {
      const tableInfo = db.prepare('PRAGMA table_info(leads)').all();
      const columnNames = tableInfo.map((col: any) => col.name);
      
      expect(columnNames).toEqual(
        expect.arrayContaining([
          'id', 'import_id', 'company', 'contact_name', 'email', 'title', 
          'additional_fields', 'status', 'woodpecker_campaign_id', 'export_date', 'created_at'
        ])
      );
      
      // Check foreign key constraint
      const foreignKeys = db.prepare('PRAGMA foreign_key_list(leads)').all();
      expect(foreignKeys).toHaveLength(1);
      expect((foreignKeys[0] as any).table).toBe('imports');
    });
    
    it('should create generated_content table with correct schema', () => {
      const tableInfo = db.prepare('PRAGMA table_info(generated_content)').all();
      const columnNames = tableInfo.map((col: any) => col.name);
      
      expect(columnNames).toEqual(
        expect.arrayContaining([
          'id', 'lead_id', 'touchpoint_number', 'content', 'content_type', 
          'template_id', 'status', 'generated_at', 'approved_at'
        ])
      );
      
      // Check foreign key constraint
      const foreignKeys = db.prepare('PRAGMA foreign_key_list(generated_content)').all();
      expect(foreignKeys).toHaveLength(1);
      expect((foreignKeys[0] as any).table).toBe('leads');
    });
    
    it('should create mappings table with correct schema', () => {
      const tableInfo = db.prepare('PRAGMA table_info(mappings)').all();
      const columnNames = tableInfo.map((col: any) => col.name);
      
      expect(columnNames).toEqual(
        expect.arrayContaining([
          'id', 'import_id', 'csv_column', 'woodpecker_field', 
          'mapping_type', 'is_active', 'created_at'
        ])
      );
      
      // Check foreign key constraint
      const foreignKeys = db.prepare('PRAGMA foreign_key_list(mappings)').all();
      expect(foreignKeys).toHaveLength(1);
      expect((foreignKeys[0] as any).table).toBe('imports');
    });
    
    it('should create app_metadata table with correct schema', () => {
      const tableInfo = db.prepare('PRAGMA table_info(app_metadata)').all();
      const columnNames = tableInfo.map((col: any) => col.name);
      
      expect(columnNames).toEqual(
        expect.arrayContaining(['key', 'value', 'updated_at'])
      );
      
      // Check primary key
      const pkColumn = tableInfo.find((col: any) => col.pk === 1);
      expect(pkColumn?.name).toBe('key');
    });
  });
  
  describe('Indexes', () => {
    it('should create all required indexes', () => {
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name LIKE 'idx_%'
      `).all();
      
      const indexNames = indexes.map((idx: any) => idx.name);
      
      expect(indexNames).toEqual(
        expect.arrayContaining([
          'idx_leads_import_id',
          'idx_leads_email',
          'idx_leads_status',
          'idx_generated_content_lead_id',
          'idx_generated_content_status',
          'idx_mappings_import_id',
          'idx_imports_status',
          'idx_imports_date'
        ])
      );
    });
    
    it('should create indexes on correct columns', () => {
      // Test one specific index
      const indexInfo = db.prepare('PRAGMA index_info(idx_leads_import_id)').all();
      expect((indexInfo[0] as any).name).toBe('import_id');
    });
  });
  
  describe('Data Integrity', () => {
    it('should enforce check constraints on imports status', () => {
      expect(() => {
        db.prepare('INSERT INTO imports (filename, status) VALUES (?, ?)').run('test.csv', 'invalid_status');
      }).toThrow();
    });
    
    it('should enforce check constraints on leads status', () => {
      // First create a valid import
      const importResult = db.prepare('INSERT INTO imports (filename, status) VALUES (?, ?)').run('test.csv', 'completed');
      
      expect(() => {
        db.prepare('INSERT INTO leads (import_id, status) VALUES (?, ?)').run(importResult.lastInsertRowid, 'invalid_status');
      }).toThrow();
    });
    
    it('should enforce foreign key constraints', () => {
      expect(() => {
        db.prepare('INSERT INTO leads (import_id, email) VALUES (?, ?)').run(999, 'test@example.com');
      }).toThrow();
    });
    
    it('should cascade delete from imports to leads', () => {
      // Create import and lead
      const importResult = db.prepare('INSERT INTO imports (filename, status) VALUES (?, ?)').run('test.csv', 'completed');
      db.prepare('INSERT INTO leads (import_id, email) VALUES (?, ?)').run(importResult.lastInsertRowid, 'test@example.com');
      
      // Verify lead exists
      const leadsBefore = db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number };
      expect(leadsBefore.count).toBe(1);
      
      // Delete import
      db.prepare('DELETE FROM imports WHERE id = ?').run(importResult.lastInsertRowid);
      
      // Verify lead was cascaded
      const leadsAfter = db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number };
      expect(leadsAfter.count).toBe(0);
    });
  });
  
  describe('Initial Metadata', () => {
    it('should insert initial metadata values', () => {
      const metadata = db.prepare('SELECT * FROM app_metadata').all();
      
      expect(metadata.length).toBeGreaterThanOrEqual(INITIAL_METADATA.length);
      
      const schemaVersion = db.prepare('SELECT value FROM app_metadata WHERE key = ?').get('schema_version');
      expect((schemaVersion as any)?.value).toBe('1.0.0');
      
      const createdAt = db.prepare('SELECT value FROM app_metadata WHERE key = ?').get('created_at');
      expect((createdAt as any)?.value).toBeDefined();
      
      const lastMigration = db.prepare('SELECT value FROM app_metadata WHERE key = ?').get('last_migration');
      expect((lastMigration as any)?.value).toBe('1.0.0');
    });
  });
  
  describe('SQL Syntax Validation', () => {
    it('should have valid SQL for all table creation statements', () => {
      Object.entries(CREATE_TABLES_SQL).forEach(([tableName, sql]) => {
        expect(() => {
          // Create a temporary database to test SQL
          const tempDb = new Database(':memory:');
          tempDb.exec(sql);
          tempDb.close();
        }).not.toThrow(`Table ${tableName} SQL should be valid`);
      });
    });
    
    it('should have valid SQL for all index creation statements', () => {
      CREATE_INDEXES_SQL.forEach((sql, index) => {
        expect(() => {
          // Create a temporary database with tables first
          const tempDb = new Database(':memory:');
          Object.values(CREATE_TABLES_SQL).forEach(tableSql => {
            tempDb.exec(tableSql);
          });
          tempDb.exec(sql);
          tempDb.close();
        }).not.toThrow(`Index ${index} SQL should be valid`);
      });
    });
  });
});
