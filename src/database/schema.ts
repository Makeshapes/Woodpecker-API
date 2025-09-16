/**
 * Database schema definitions for SQLite database
 */

export const CREATE_TABLES_SQL = {
  imports: `
    CREATE TABLE IF NOT EXISTS imports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      lead_count INTEGER DEFAULT 0,
      error_messages TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
  
  leads: `
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      import_id INTEGER NOT NULL,
      company TEXT,
      contact_name TEXT,
      email TEXT,
      title TEXT,
      additional_fields TEXT, -- JSON string
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'exported', 'failed')),
      woodpecker_campaign_id TEXT,
      export_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE CASCADE
    )
  `,
  
  generated_content: `
    CREATE TABLE IF NOT EXISTS generated_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      touchpoint_number INTEGER NOT NULL,
      content TEXT NOT NULL,
      content_type TEXT NOT NULL CHECK (content_type IN ('email', 'subject', 'template')),
      template_id TEXT,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected')),
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    )
  `,
  
  mappings: `
    CREATE TABLE IF NOT EXISTS mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      import_id INTEGER NOT NULL,
      csv_column TEXT NOT NULL,
      woodpecker_field TEXT NOT NULL,
      mapping_type TEXT DEFAULT 'direct' CHECK (mapping_type IN ('direct', 'computed', 'default')),
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE CASCADE
    )
  `,
  
  app_metadata: `
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `
};

export const CREATE_INDEXES_SQL = [
  'CREATE INDEX IF NOT EXISTS idx_leads_import_id ON leads(import_id)',
  'CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email)',
  'CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)',
  'CREATE INDEX IF NOT EXISTS idx_generated_content_lead_id ON generated_content(lead_id)',
  'CREATE INDEX IF NOT EXISTS idx_generated_content_status ON generated_content(status)',
  'CREATE INDEX IF NOT EXISTS idx_mappings_import_id ON mappings(import_id)',
  'CREATE INDEX IF NOT EXISTS idx_imports_status ON imports(status)',
  'CREATE INDEX IF NOT EXISTS idx_imports_date ON imports(import_date)'
];

export const INITIAL_METADATA = [
  { key: 'schema_version', value: '1.0.0' },
  { key: 'created_at', value: new Date().toISOString() },
  { key: 'last_migration', value: '1.0.0' }
];
