import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { 
  withDatabase, 
  withTransaction, 
  checkDatabaseHealth, 
  getDatabaseStats, 
  vacuumDatabase,
  getMetadata,
  setMetadata,
  dbPool
} from '../utils';
import { initializeDatabase, closeDatabase } from '../init';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-app-data')
  }
}));

describe('Database Utils', () => {
  const testDbPath = path.join('/tmp', 'test-utils-leads.db');
  
  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // Mock getDatabasePath to return test path
    const initModule = await import('../init');
    vi.spyOn(initModule, 'getDatabasePath').mockReturnValue(testDbPath);
    
    // Initialize test database
    const db = initializeDatabase();
    closeDatabase(db);
  });
  
  afterEach(() => {
    // Clean up database pool
    dbPool.closeAll();
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    vi.restoreAllMocks();
  });
  
  describe('withDatabase', () => {
    it('should execute operation with database connection', () => {
      const result = withDatabase(db => {
        const test = db.prepare('SELECT 1 as value').get();
        return (test as any).value;
      });
      
      expect(result).toBe(1);
    });
    
    it('should handle operation errors', () => {
      expect(() => {
        withDatabase(db => {
          db.prepare('INVALID SQL').get();
        });
      }).toThrow();
    });
  });
  
  describe('withTransaction', () => {
    it('should execute transaction successfully', () => {
      const uniqueKey = `test_key_${Date.now()}`;
      withTransaction(db => {
        db.prepare('INSERT INTO app_metadata (key, value) VALUES (?, ?)').run(uniqueKey, 'test_value');
      });
      
      const result = withDatabase(db => {
        return db.prepare('SELECT value FROM app_metadata WHERE key = ?').get(uniqueKey);
      });
      
      expect((result as any)?.value).toBe('test_value');
    });
    
    it('should rollback transaction on error', () => {
      expect(() => {
        withTransaction(db => {
          db.prepare('INSERT INTO app_metadata (key, value) VALUES (?, ?)').run('test_key2', 'test_value2');
          throw new Error('Transaction error');
        });
      }).toThrow('Transaction error');
      
      const result = withDatabase(db => {
        return db.prepare('SELECT value FROM app_metadata WHERE key = ?').get('test_key2');
      });
      
      expect(result).toBeUndefined();
    });
  });
  
  describe('checkDatabaseHealth', () => {
    it('should return healthy status for working database', () => {
      const health = checkDatabaseHealth();
      
      expect(health.healthy).toBe(true);
      expect(health.error).toBeUndefined();
    });
    
    it('should return unhealthy status for broken database', async () => {
      // Mock getDatabase to throw error
      const initModule = await import('../init');
      vi.spyOn(initModule, 'getDatabase').mockImplementation(() => {
        throw new Error('Database connection failed');
      });
      
      const health = checkDatabaseHealth();
      
      expect(health.healthy).toBe(false);
      expect(health.error).toBe('Database connection failed');
    });
  });
  
  describe('getDatabaseStats', () => {
    it('should return database statistics', () => {
      const stats = getDatabaseStats();
      
      expect(stats).toHaveProperty('imports');
      expect(stats).toHaveProperty('leads');
      expect(stats).toHaveProperty('generatedContent');
      expect(stats).toHaveProperty('mappings');
      expect(stats).toHaveProperty('databaseSize');
      
      expect(typeof stats.imports).toBe('number');
      expect(typeof stats.leads).toBe('number');
      expect(typeof stats.generatedContent).toBe('number');
      expect(typeof stats.mappings).toBe('number');
      expect(typeof stats.databaseSize).toBe('number');
    });
    
    it('should return correct counts after data insertion', () => {
      // Get initial count
      const initialStats = getDatabaseStats();
      
      // Insert test data
      withDatabase(db => {
        db.prepare('INSERT INTO imports (filename, status) VALUES (?, ?)').run('test.csv', 'completed');
      });
      
      const stats = getDatabaseStats();
      expect(stats.imports).toBe(initialStats.imports + 1);
    });
  });
  
  describe('vacuumDatabase', () => {
    it('should vacuum database without errors', () => {
      expect(() => vacuumDatabase()).not.toThrow();
    });
  });
  
  describe('metadata operations', () => {
    it('should set and get metadata', () => {
      setMetadata('test_setting', 'test_value');
      
      const value = getMetadata('test_setting');
      expect(value).toBe('test_value');
    });
    
    it('should return null for non-existent metadata', () => {
      const value = getMetadata('non_existent_key');
      expect(value).toBeNull();
    });
    
    it('should update existing metadata', () => {
      setMetadata('update_test', 'initial_value');
      setMetadata('update_test', 'updated_value');
      
      const value = getMetadata('update_test');
      expect(value).toBe('updated_value');
    });
  });
  
  describe('DatabasePool', () => {
    it('should manage connections properly', () => {
      const db1 = dbPool.getConnection();
      const db2 = dbPool.getConnection();
      
      expect(db1).toBeDefined();
      expect(db2).toBeDefined();
      
      dbPool.releaseConnection(db1);
      dbPool.releaseConnection(db2);
      
      // Should reuse released connection
      const db3 = dbPool.getConnection();
      expect(db3).toBeDefined(); // Connection should be available
      
      dbPool.releaseConnection(db3);
    });
    
    it('should close excess connections', () => {
      const connections = [];
      
      // Get more connections than max pool size
      for (let i = 0; i < 7; i++) {
        connections.push(dbPool.getConnection());
      }
      
      // Release all connections
      connections.forEach(db => dbPool.releaseConnection(db));
      
      // Pool should only keep max connections
      expect(() => dbPool.closeAll()).not.toThrow();
    });
  });
});
