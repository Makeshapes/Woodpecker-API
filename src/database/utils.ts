import Database from 'better-sqlite3';
import { getDatabase, closeDatabase } from './init';

/**
 * Database connection pool for managing connections
 */
class DatabasePool {
  private connections: Database.Database[] = [];
  private maxConnections = 5;
  
  getConnection(): Database.Database {
    if (this.connections.length > 0) {
      return this.connections.pop()!;
    }
    return getDatabase();
  }
  
  releaseConnection(db: Database.Database): void {
    if (this.connections.length < this.maxConnections) {
      this.connections.push(db);
    } else {
      closeDatabase(db);
    }
  }
  
  closeAll(): void {
    this.connections.forEach(db => closeDatabase(db));
    this.connections = [];
  }
}

export const dbPool = new DatabasePool();

/**
 * Execute a database operation with automatic connection management
 */
export function withDatabase<T>(operation: (db: Database.Database) => T): T {
  const db = dbPool.getConnection();
  try {
    return operation(db);
  } finally {
    dbPool.releaseConnection(db);
  }
}

/**
 * Execute a database transaction with automatic rollback on error
 */
export function withTransaction<T>(operation: (db: Database.Database) => T): T {
  return withDatabase(db => {
    const transaction = db.transaction(() => operation(db));
    return transaction();
  });
}

/**
 * Check database health and connectivity
 */
export function checkDatabaseHealth(): { healthy: boolean; error?: string } {
  try {
    return withDatabase(db => {
      // Simple query to test connectivity
      const result = db.prepare('SELECT 1 as test').get();
      return { healthy: result !== undefined };
    });
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get database statistics
 */
export interface DatabaseStats {
  imports: number;
  leads: number;
  generatedContent: number;
  mappings: number;
  databaseSize: number;
}

export function getDatabaseStats(): DatabaseStats {
  return withDatabase(db => {
    const imports = db.prepare('SELECT COUNT(*) as count FROM imports').get() as { count: number };
    const leads = db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number };
    const generatedContent = db.prepare('SELECT COUNT(*) as count FROM generated_content').get() as { count: number };
    const mappings = db.prepare('SELECT COUNT(*) as count FROM mappings').get() as { count: number };
    
    // Get database file size
    const sizeQuery = db.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get() as { size: number };
    
    return {
      imports: imports.count,
      leads: leads.count,
      generatedContent: generatedContent.count,
      mappings: mappings.count,
      databaseSize: sizeQuery.size
    };
  });
}

/**
 * Vacuum database to optimize storage
 */
export function vacuumDatabase(): void {
  withDatabase(db => {
    db.exec('VACUUM');
  });
}

/**
 * Get app metadata value
 */
export function getMetadata(key: string): string | null {
  return withDatabase(db => {
    const stmt = db.prepare('SELECT value FROM app_metadata WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value || null;
  });
}

/**
 * Set app metadata value
 */
export function setMetadata(key: string, value: string): void {
  withDatabase(db => {
    const stmt = db.prepare(`
      INSERT INTO app_metadata (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET 
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(key, value);
  });
}

/**
 * Clean up database pool on application exit
 */
export function cleanup(): void {
  dbPool.closeAll();
}

// Register cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}
