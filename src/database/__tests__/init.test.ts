import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { initializeDatabase, isDatabaseInitialized, getDatabasePath, getDatabase, closeDatabase } from '../init';
import Database from 'better-sqlite3';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-app-data')
  }
}));

describe('Database Initialization', () => {
  const testDbPath = path.join('/tmp', 'test-leads.db');
  
  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // Mock getDatabasePath to return test path
    const initModule = await import('../init');
    vi.spyOn(initModule, 'getDatabasePath').mockReturnValue(testDbPath);
  });
  
  afterEach(() => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    vi.restoreAllMocks();
  });
  
  describe('getDatabasePath', () => {
    it('should return correct path for electron app', () => {
      vi.restoreAllMocks();
      const path = getDatabasePath();
      expect(path).toContain('leads.db');
    });
  });
  
  describe('initializeDatabase', () => {
    it('should create database file', async () => {
      const uniquePath = `/tmp/test-create-${Date.now()}.db`;
      const initModule = await import('../init');
      vi.spyOn(initModule, 'getDatabasePath').mockReturnValue(uniquePath);
      
      expect(fs.existsSync(uniquePath)).toBe(false);
      
      const db = initializeDatabase();
      expect(fs.existsSync(uniquePath)).toBe(true);
      
      closeDatabase(db);
      fs.unlinkSync(uniquePath);
    });
    
    it('should create all required tables', () => {
      const db = initializeDatabase();
      
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('imports', 'leads', 'generated_content', 'mappings', 'app_metadata')
      `).all();
      
      expect(tables).toHaveLength(5);
      expect(tables.map(t => (t as any).name)).toEqual(
        expect.arrayContaining(['imports', 'leads', 'generated_content', 'mappings', 'app_metadata'])
      );
      
      closeDatabase(db);
    });
    
    it('should create indexes', () => {
      const db = initializeDatabase();
      
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name LIKE 'idx_%'
      `).all();
      
      expect(indexes.length).toBeGreaterThan(0);
      
      closeDatabase(db);
    });
    
    it('should insert initial metadata', () => {
      const db = initializeDatabase();
      
      const metadata = db.prepare('SELECT * FROM app_metadata').all();
      expect(metadata.length).toBeGreaterThan(0);
      
      const schemaVersion = db.prepare('SELECT value FROM app_metadata WHERE key = ?').get('schema_version');
      expect((schemaVersion as any)?.value).toBe('1.0.0');
      
      closeDatabase(db);
    });
    
    it('should enable foreign key constraints', () => {
      const db = initializeDatabase();
      
      const foreignKeys = db.pragma('foreign_keys');
      expect(foreignKeys).toEqual([{ foreign_keys: 1 }]);
      
      closeDatabase(db);
    });
    
    it('should handle initialization errors', async () => {
      // Create a path that will cause an error
      const badPath = '/invalid/path/that/does/not/exist';
      const initModule = await import('../init');
      vi.spyOn(initModule, 'getDatabasePath').mockReturnValue(badPath);
      
      expect(() => initializeDatabase()).toThrow('Failed to initialize database');
    });
  });
  
  describe('isDatabaseInitialized', () => {
    it('should return false for non-existent database', async () => {
      // Use a different path that doesn't exist
      const nonExistentPath = '/tmp/non-existent-db.db';
      const initModule = await import('../init');
      vi.spyOn(initModule, 'getDatabasePath').mockReturnValue(nonExistentPath);
      expect(isDatabaseInitialized()).toBe(false);
    });
    
    it('should return true for properly initialized database', () => {
      const db = initializeDatabase();
      closeDatabase(db);
      
      expect(isDatabaseInitialized()).toBe(true);
    });
    
    it('should return false for corrupted database', async () => {
      // Create empty file at a different path
      const corruptedPath = '/tmp/corrupted-db.db';
      fs.writeFileSync(corruptedPath, '');
      const initModule = await import('../init');
      vi.spyOn(initModule, 'getDatabasePath').mockReturnValue(corruptedPath);
      
      expect(isDatabaseInitialized()).toBe(false);
      
      // Clean up
      fs.unlinkSync(corruptedPath);
    });
  });
  
  describe('getDatabase', () => {
    it('should initialize database if not exists', async () => {
      const newDbPath = '/tmp/new-test-db.db';
      if (fs.existsSync(newDbPath)) {
        fs.unlinkSync(newDbPath);
      }
      const initModule = await import('../init');
      vi.spyOn(initModule, 'getDatabasePath').mockReturnValue(newDbPath);
      
      expect(fs.existsSync(newDbPath)).toBe(false);
      
      const db = getDatabase();
      expect(fs.existsSync(newDbPath)).toBe(true);
      
      closeDatabase(db);
      fs.unlinkSync(newDbPath);
    });
    
    it('should return existing database connection', () => {
      // First initialize
      const db1 = initializeDatabase();
      closeDatabase(db1);
      
      // Then get existing
      const db2 = getDatabase();
      expect(db2).toBeInstanceOf(Database);
      
      closeDatabase(db2);
    });
  });
  
  describe('closeDatabase', () => {
    it('should close database without errors', () => {
      const db = initializeDatabase();
      
      expect(() => closeDatabase(db)).not.toThrow();
    });
    
    it('should handle errors gracefully', () => {
      const db = initializeDatabase();
      
      // Mock close to throw error
      vi.spyOn(db, 'close').mockImplementation(() => {
        throw new Error('Close error');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => closeDatabase(db)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Error closing database:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});
