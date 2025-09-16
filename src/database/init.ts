import Database from 'better-sqlite3';
import { CREATE_TABLES_SQL, CREATE_INDEXES_SQL, INITIAL_METADATA } from './schema';
import path from 'path';
import fs from 'fs';

// Safely import electron app if available
let electronApp: any = null;
try {
  electronApp = require('electron')?.app;
} catch {
  // Electron not available (e.g., in tests or web environment)
}

/**
 * Get the database file path in the user's application data directory
 */
export function getDatabasePath(): string {
  // For Electron app, use userData directory
  if (electronApp && electronApp.getPath) {
    const userDataPath = electronApp.getPath('userData');
    return path.join(userDataPath, 'leads.db');
  }
  
  // Fallback for development/testing
  return path.join(process.cwd(), 'leads.db');
}

/**
 * Initialize the SQLite database with all required tables and indexes
 */
export function initializeDatabase(): Database.Database {
  const dbPath = getDatabasePath();
  
  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  try {
    // Create database connection
    const db = new Database(dbPath);
    
    // Enable foreign key constraints
    db.pragma('foreign_keys = ON');
    
    // Set WAL mode for better concurrent access
    db.pragma('journal_mode = WAL');
    
    // Create all tables
    const createTables = db.transaction(() => {
      Object.values(CREATE_TABLES_SQL).forEach(sql => {
        db.exec(sql);
      });
      
      // Create indexes
      CREATE_INDEXES_SQL.forEach(sql => {
        db.exec(sql);
      });
      
      // Insert initial metadata if not exists
      const checkMetadata = db.prepare('SELECT COUNT(*) as count FROM app_metadata');
      const metadataCount = checkMetadata.get() as { count: number };
      
      if (metadataCount.count === 0) {
        const insertMetadata = db.prepare('INSERT INTO app_metadata (key, value) VALUES (?, ?)');
        INITIAL_METADATA.forEach(({ key, value }) => {
          insertMetadata.run(key, value);
        });
      }
    });
    
    createTables();
    
    return db;
  } catch (error) {
    throw new Error(`Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if database exists and is properly initialized
 */
export function isDatabaseInitialized(): boolean {
  const dbPath = getDatabasePath();
  
  if (!fs.existsSync(dbPath)) {
    return false;
  }
  
  try {
    const db = new Database(dbPath, { readonly: true });
    
    // Check if all required tables exist
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('imports', 'leads', 'generated_content', 'mappings', 'app_metadata')
    `).all();
    
    db.close();
    
    return tables.length === 5;
  } catch {
    return false;
  }
}

/**
 * Get database connection (creates and initializes if needed)
 */
export function getDatabase(): Database.Database {
  if (!isDatabaseInitialized()) {
    return initializeDatabase();
  }
  
  const dbPath = getDatabasePath();
  const db = new Database(dbPath);
  
  // Enable foreign key constraints
  db.pragma('foreign_keys = ON');
  
  return db;
}

/**
 * Close database connection safely
 */
export function closeDatabase(db: Database.Database): void {
  try {
    if (db && typeof db.close === 'function') {
      db.close();
    }
  } catch (error) {
    console.error('Error closing database:', error);
  }
}
