import Database from 'better-sqlite3';
import { getDatabase, getDatabasePath } from './init';
import { logger } from '../main/utils/logger';
import fs from 'fs';

/**
 * Migration to transform old schema to new schema with all Woodpecker fields
 */
export function migrateToV2Schema(): void {
  const dbPath = getDatabasePath();

  // Check if database exists
  if (!fs.existsSync(dbPath)) {
    console.log('No existing database to migrate');
    return;
  }

  try {
    const db = getDatabase();

    // Check current schema version
    const currentVersion = db.prepare('SELECT value FROM app_metadata WHERE key = ?').get('schema_version') as { value: string } | undefined;

    if (currentVersion?.value === '2.0.0') {
      console.log('Database already on version 2.0.0');
      db.close();
      return;
    }

    console.log('Starting migration from v1 to v2 schema...');

    // Begin transaction for safe migration
    const migrate = db.transaction(() => {
      // Step 1: Create new leads table with all fields
      db.exec(`
        CREATE TABLE IF NOT EXISTS leads_new (
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
          additional_fields TEXT,
          -- Status and tracking
          status TEXT DEFAULT 'imported',
          woodpecker_campaign_id TEXT,
          export_date DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE CASCADE
        )
      `);

      // Step 2: Copy existing data and migrate contact_name to first_name/last_name
      const existingLeads = db.prepare('SELECT * FROM leads').all() as any[];

      const insertStmt = db.prepare(`
        INSERT INTO leads_new (
          id, import_id, first_name, last_name, company, email, title,
          phone, website, linkedin_url, address, city, state, country,
          industry, tags, snippet1, snippet2, snippet3, snippet4, snippet5,
          snippet6, snippet7, snippet8, snippet9, snippet10, snippet11,
          snippet12, snippet13, snippet14, snippet15, additional_fields,
          status, woodpecker_campaign_id, export_date, created_at
        ) VALUES (
          @id, @import_id, @first_name, @last_name, @company, @email, @title,
          @phone, @website, @linkedin_url, @address, @city, @state, @country,
          @industry, @tags, @snippet1, @snippet2, @snippet3, @snippet4, @snippet5,
          @snippet6, @snippet7, @snippet8, @snippet9, @snippet10, @snippet11,
          @snippet12, @snippet13, @snippet14, @snippet15, @additional_fields,
          @status, @woodpecker_campaign_id, @export_date, @created_at
        )
      `);

      for (const lead of existingLeads) {
        // Parse contact_name into first_name and last_name
        let firstName = '';
        let lastName = '';
        if (lead.contact_name) {
          const nameParts = lead.contact_name.trim().split(/\s+/);
          if (nameParts.length === 1) {
            firstName = nameParts[0];
          } else if (nameParts.length === 2) {
            firstName = nameParts[0];
            lastName = nameParts[1];
          } else if (nameParts.length > 2) {
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ');
          }
        }

        // Extract fields from additional_fields JSON if present
        let additionalData: any = {};
        let remainingAdditionalFields: any = {};

        if (lead.additional_fields) {
          try {
            additionalData = JSON.parse(lead.additional_fields);

            // Create a copy of additional fields to preserve non-standard fields
            remainingAdditionalFields = { ...additionalData };

            // Remove standard fields that will be moved to columns
            const standardFields = [
              'first_name', 'last_name', 'phone', 'website', 'linkedin_url', 'linkedinUrl',
              'address', 'city', 'state', 'country', 'industry', 'tags',
              'snippet1', 'snippet2', 'snippet3', 'snippet4', 'snippet5',
              'snippet6', 'snippet7', 'snippet8', 'snippet9', 'snippet10',
              'snippet11', 'snippet12', 'snippet13', 'snippet14', 'snippet15'
            ];

            for (const field of standardFields) {
              delete remainingAdditionalFields[field];
            }
          } catch (e) {
            console.error('Error parsing additional_fields for lead', lead.id, e);
          }
        }

        // Map LinkedIn URL variations
        const linkedinUrl = additionalData.linkedin_url ||
                          additionalData.linkedinUrl ||
                          additionalData['LinkedIn URL'] ||
                          additionalData['LinkedIn Profile'] ||
                          '';

        // Map website variations
        const website = additionalData.website ||
                       additionalData.Website ||
                       additionalData.www ||
                       additionalData.WWW ||
                       '';

        insertStmt.run({
          id: lead.id,
          import_id: lead.import_id,
          first_name: firstName || additionalData.first_name || '',
          last_name: lastName || additionalData.last_name || '',
          company: lead.company || '',
          email: lead.email || '',
          title: lead.title || '',
          phone: additionalData.phone || '',
          website: website,
          linkedin_url: linkedinUrl,
          address: additionalData.address || '',
          city: additionalData.city || '',
          state: additionalData.state || '',
          country: additionalData.country || '',
          industry: additionalData.industry || '',
          tags: additionalData.tags || '',
          snippet1: additionalData.snippet1 || '',
          snippet2: additionalData.snippet2 || '',
          snippet3: additionalData.snippet3 || '',
          snippet4: additionalData.snippet4 || '',
          snippet5: additionalData.snippet5 || '',
          snippet6: additionalData.snippet6 || '',
          snippet7: additionalData.snippet7 || '',
          snippet8: additionalData.snippet8 || '',
          snippet9: additionalData.snippet9 || '',
          snippet10: additionalData.snippet10 || '',
          snippet11: additionalData.snippet11 || '',
          snippet12: additionalData.snippet12 || '',
          snippet13: additionalData.snippet13 || '',
          snippet14: additionalData.snippet14 || '',
          snippet15: additionalData.snippet15 || '',
          additional_fields: Object.keys(remainingAdditionalFields).length > 0
            ? JSON.stringify(remainingAdditionalFields)
            : null,
          status: lead.status,
          woodpecker_campaign_id: lead.woodpecker_campaign_id,
          export_date: lead.export_date,
          created_at: lead.created_at
        });
      }

      // Step 3: Drop old table and rename new one
      db.exec('DROP TABLE leads');
      db.exec('ALTER TABLE leads_new RENAME TO leads');

      // Step 4: Recreate indexes
      db.exec('CREATE INDEX IF NOT EXISTS idx_leads_import_id ON leads(import_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_leads_first_name ON leads(first_name)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_leads_last_name ON leads(last_name)');

      // Step 5: Update schema version
      db.prepare('UPDATE app_metadata SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?')
        .run('2.0.0', 'schema_version');

      db.prepare('UPDATE app_metadata SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?')
        .run('2.0.0', 'last_migration');

      console.log(`✅ Migration completed successfully. Migrated ${existingLeads.length} leads.`);
    });

    migrate();
    db.close();

  } catch (error) {
    console.error('Migration failed:', error);
    logger.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Check if migration is needed
 */
export function isMigrationNeeded(): boolean {
  const dbPath = getDatabasePath();

  if (!fs.existsSync(dbPath)) {
    return false;
  }

  try {
    const db = getDatabase();
    const currentVersion = db.prepare('SELECT value FROM app_metadata WHERE key = ?').get('schema_version') as { value: string } | undefined;
    db.close();

    return currentVersion?.value !== '2.0.0';
  } catch {
    return false;
  }
}