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
      -- Core Woodpecker fields
      first_name TEXT,
      last_name TEXT,
      company TEXT,
      email TEXT,
      title TEXT,
      phone TEXT,
      website TEXT,
      linkedin_url TEXT,
      -- Location fields
      address TEXT,
      city TEXT,
      state TEXT,
      country TEXT,
      -- Additional Woodpecker fields
      industry TEXT,
      tags TEXT,
      -- Custom snippets (1-15)
      snippet1 TEXT,
      snippet2 TEXT,
      snippet3 TEXT,
      snippet4 TEXT,
      snippet5 TEXT,
      snippet6 TEXT,
      snippet7 TEXT,
      snippet8 TEXT,
      snippet9 TEXT,
      snippet10 TEXT,
      snippet11 TEXT,
      snippet12 TEXT,
      snippet13 TEXT,
      snippet14 TEXT,
      snippet15 TEXT,
      -- Legacy field for truly custom data
      additional_fields TEXT, -- JSON string for any non-standard fields
      -- Status and tracking
      status TEXT DEFAULT 'imported' CHECK (status IN ('imported', 'generating', 'drafted', 'approved', 'exported', 'failed', 'deleted')),
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
  'CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company)',
  'CREATE INDEX IF NOT EXISTS idx_leads_first_name ON leads(first_name)',
  'CREATE INDEX IF NOT EXISTS idx_leads_last_name ON leads(last_name)',
  'CREATE INDEX IF NOT EXISTS idx_generated_content_lead_id ON generated_content(lead_id)',
  'CREATE INDEX IF NOT EXISTS idx_generated_content_status ON generated_content(status)',
  'CREATE INDEX IF NOT EXISTS idx_mappings_import_id ON mappings(import_id)',
  'CREATE INDEX IF NOT EXISTS idx_imports_status ON imports(status)',
  'CREATE INDEX IF NOT EXISTS idx_imports_date ON imports(import_date)'
];

export const INITIAL_METADATA = [
  { key: 'schema_version', value: '2.0.0' },
  { key: 'created_at', value: new Date().toISOString() },
  { key: 'last_migration', value: '2.0.0' }
];
