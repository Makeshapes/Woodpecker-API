import { ipcMain, dialog, app } from 'electron'
import { settingsService } from '../services/settingsService'
import { logger } from '../utils/logger'
import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { dbPool } from '../../database/utils'

// Helper function to get the database path
function getDatabasePath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'leads.db')
}

export function setupSettingsHandlers(): void {
  // Get current API keys status (masked for security)
  ipcMain.handle('settings:getApiKeysStatus', async () => {
    try {
      const validation = settingsService.validateApiKeys()
      return {
        claude: validation.claude,
        woodpecker: validation.woodpecker,
        // Return masked keys for display (show last 4 chars only)
        claudeKeyMasked: validation.claude ? maskApiKey(settingsService.getClaudeApiKey()) : null,
        woodpeckerKeyMasked: validation.woodpecker ? maskApiKey(settingsService.getWoodpeckerApiKey()) : null,
      }
    } catch (error) {
      logger.error('Failed to get API keys status:', error)
      throw error
    }
  })

  // Update API keys
  ipcMain.handle('settings:updateApiKeys', async (_, keys: { claudeApiKey?: string; woodpeckerApiKey?: string }) => {
    try {
      settingsService.updateApiKeys(keys)

      // Reset API clients to use new keys
      if (keys.claudeApiKey) {
        // This will force the client to reinitialize with the new key
        global.anthropicClient = null
      }

      return { success: true }
    } catch (error) {
      logger.error('Failed to update API keys:', error)
      throw error
    }
  })

  // Validate Claude API key
  ipcMain.handle('settings:validateClaudeKey', async (_, apiKey: string) => {
    try {
      const Anthropic = await import('@anthropic-ai/sdk')
      const client = new Anthropic.default({ apiKey })

      // Make a minimal API call to validate the key
      await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      })

      return { valid: true }
    } catch (error: any) {
      logger.error('Claude API key validation failed:', error)
      return {
        valid: false,
        error: error?.message || 'Invalid API key'
      }
    }
  })

  // Validate Woodpecker API key
  ipcMain.handle('settings:validateWoodpeckerKey', async (_, apiKey: string) => {
    try {
      // Make a test API call to validate the key
      const response = await fetch('https://api.woodpecker.co/rest/v1/campaign_list', {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        return { valid: true }
      } else if (response.status === 401) {
        return { valid: false, error: 'Invalid API key' }
      } else {
        return { valid: false, error: `API error: ${response.status}` }
      }
    } catch (error: any) {
      logger.error('Woodpecker API key validation failed:', error)
      return {
        valid: false,
        error: error?.message || 'Failed to validate API key'
      }
    }
  })

  // Get settings file location (for debugging)
  ipcMain.handle('settings:getSettingsPath', async () => {
    return settingsService.getSettingsPath()
  })

  // Export database
  ipcMain.handle('settings:exportDatabase', async () => {
    try {
      const dbPath = getDatabasePath()

      // Check if database exists
      if (!fs.existsSync(dbPath)) {
        throw new Error('Database file not found')
      }

      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Export Database',
        defaultPath: path.join(app.getPath('downloads'), `woodpecker-db-${Date.now()}.db`),
        filters: [
          { name: 'SQLite Database', extensions: ['db'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true }
      }

      // Check database size before WAL checkpoint
      const beforeStats = fs.statSync(dbPath)
      console.log(`🔍 [DATABASE EXPORT] Database size before checkpoint: ${beforeStats.size} bytes`)

      // Check if WAL file exists
      const walPath = `${dbPath}-wal`
      if (fs.existsSync(walPath)) {
        const walStats = fs.statSync(walPath)
        console.log(`🔍 [DATABASE EXPORT] WAL file size: ${walStats.size} bytes`)
      } else {
        console.log('🔍 [DATABASE EXPORT] No WAL file found')
      }

      // Close all existing database connections first
      console.log('🔍 [DATABASE EXPORT] Closing all database connections before checkpoint...')
      dbPool.closeAll()

      // Wait a moment for connections to fully close
      await new Promise(resolve => setTimeout(resolve, 500))

      // Force WAL checkpoint to merge all data into main database file
      console.log('🔍 [DATABASE EXPORT] Performing WAL checkpoint...')
      const db = new Database(dbPath)

      // Try multiple checkpoint operations to ensure complete merge
      const checkpointResult = db.pragma('wal_checkpoint(TRUNCATE)')
      console.log('🔍 [DATABASE EXPORT] Checkpoint result:', checkpointResult)

      // Also try RESTART mode
      const restartResult = db.pragma('wal_checkpoint(RESTART)')
      console.log('🔍 [DATABASE EXPORT] Restart result:', restartResult)

      db.close()
      console.log('🔍 [DATABASE EXPORT] WAL checkpoint completed')

      // Wait for filesystem to sync
      await new Promise(resolve => setTimeout(resolve, 100))

      // Check database size after WAL checkpoint
      const afterStats = fs.statSync(dbPath)
      console.log(`🔍 [DATABASE EXPORT] Database size after checkpoint: ${afterStats.size} bytes`)

      // Check if WAL file still exists
      if (fs.existsSync(walPath)) {
        const walStatsAfter = fs.statSync(walPath)
        console.log(`🔍 [DATABASE EXPORT] WAL file size after checkpoint: ${walStatsAfter.size} bytes`)
      } else {
        console.log('🔍 [DATABASE EXPORT] WAL file removed after checkpoint')
      }

      // Copy database file to selected location
      fs.copyFileSync(dbPath, result.filePath)

      logger.info(`Database exported to: ${result.filePath}`)
      return {
        success: true,
        filePath: result.filePath,
        size: afterStats.size
      }
    } catch (error) {
      logger.error('Failed to export database:', error)
      throw error
    }
  })

  // Import database
  ipcMain.handle('settings:importDatabase', async () => {
    console.log('🔍 [DATABASE IMPORT] Starting import process...')
    logger.info('Starting database import process')

    try {
      // Show open dialog
      console.log('🔍 [DATABASE IMPORT] Showing file dialog...')
      const result = await dialog.showOpenDialog({
        title: 'Import Database',
        filters: [
          { name: 'SQLite Database', extensions: ['db'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (result.canceled || !result.filePaths.length) {
        console.log('🔍 [DATABASE IMPORT] User canceled dialog')
        return { success: false, canceled: true }
      }

      const importPath = result.filePaths[0]
      const dbPath = getDatabasePath()

      console.log(`🔍 [DATABASE IMPORT] Import file: ${importPath}`)
      console.log(`🔍 [DATABASE IMPORT] Target path: ${dbPath}`)
      logger.info(`Import file: ${importPath}, Target: ${dbPath}`)

      // Check if import file exists and is readable
      if (!fs.existsSync(importPath)) {
        throw new Error(`Import file does not exist: ${importPath}`)
      }

      const importStats = fs.statSync(importPath)
      console.log(`🔍 [DATABASE IMPORT] Import file size: ${importStats.size} bytes`)

      // Backup current database
      const backupPath = `${dbPath}.backup-${Date.now()}`
      if (fs.existsSync(dbPath)) {
        console.log(`🔍 [DATABASE IMPORT] Backing up current database to: ${backupPath}`)
        fs.copyFileSync(dbPath, backupPath)
        logger.info(`Current database backed up to: ${backupPath}`)
      } else {
        console.log('🔍 [DATABASE IMPORT] No existing database to backup')
      }

      try {
        // Close all existing database connections before importing
        console.log('🔍 [DATABASE IMPORT] Closing all database connections...')
        logger.info('Closing all database connections before import...')
        dbPool.closeAll()

        // Copy imported database to app location
        console.log('🔍 [DATABASE IMPORT] Copying database file...')
        fs.copyFileSync(importPath, dbPath)

        const copiedStats = fs.statSync(dbPath)
        console.log(`🔍 [DATABASE IMPORT] Copied file size: ${copiedStats.size} bytes`)

        // Verify the imported database is valid by trying to open it
        console.log('🔍 [DATABASE IMPORT] Validating imported database...')
        const testDb = new Database(dbPath, { readonly: true })

        console.log('🔍 [DATABASE IMPORT] Running validation query...')
        const testResult = testDb.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type = 'table'").get()
        console.log('🔍 [DATABASE IMPORT] Validation result:', testResult)

        if (!testResult || typeof testResult !== 'object' || !('count' in testResult)) {
          testDb.close()
          throw new Error('Invalid database file - no tables found')
        }

        const tableCount = (testResult as any).count
        console.log(`🔍 [DATABASE IMPORT] Found ${tableCount} tables in imported database`)

        // Check for specific expected tables and their data
        let dataValidation = { leads: 0, imports: 0, content: 0 }
        try {
          const leadsCount = testDb.prepare('SELECT COUNT(*) as count FROM leads').get()
          dataValidation.leads = leadsCount?.count || 0
          console.log(`🔍 [DATABASE IMPORT] Leads count: ${dataValidation.leads}`)
        } catch (e) {
          console.log('🔍 [DATABASE IMPORT] No leads table or error:', e.message)
        }

        try {
          const importsCount = testDb.prepare('SELECT COUNT(*) as count FROM imports').get()
          dataValidation.imports = importsCount?.count || 0
          console.log(`🔍 [DATABASE IMPORT] Imports count: ${dataValidation.imports}`)
        } catch (e) {
          console.log('🔍 [DATABASE IMPORT] No imports table or error:', e.message)
        }

        try {
          const contentCount = testDb.prepare('SELECT COUNT(*) as count FROM generated_content').get()
          dataValidation.content = contentCount?.count || 0
          console.log(`🔍 [DATABASE IMPORT] Content count: ${dataValidation.content}`)
        } catch (e) {
          console.log('🔍 [DATABASE IMPORT] No content table or error:', e.message)
        }

        testDb.close()

        logger.info(`Database imported from: ${importPath}, found ${tableCount} tables, data: ${JSON.stringify(dataValidation)}`)

        // Force close all database connections again to ensure clean slate
        console.log('🔍 [DATABASE IMPORT] Closing connections again for clean slate...')
        dbPool.closeAll()

        console.log('🔍 [DATABASE IMPORT] Import completed successfully!')
        return {
          success: true,
          filePath: importPath,
          backupPath: backupPath,
          size: fs.statSync(importPath).size,
          requiresRestart: true
        }
      } catch (error) {
        console.error('🔍 [DATABASE IMPORT] Import failed:', error)
        // Restore backup if import failed
        if (fs.existsSync(backupPath)) {
          console.log('🔍 [DATABASE IMPORT] Restoring backup...')
          fs.copyFileSync(backupPath, dbPath)
          logger.error('Import failed, restored backup')
        }
        throw error
      }
    } catch (error) {
      console.error('🔍 [DATABASE IMPORT] Overall import failed:', error)
      logger.error('Failed to import database:', error)
      throw error
    }
  })

  // Get database info
  ipcMain.handle('settings:getDatabaseInfo', async () => {
    try {
      const dbPath = getDatabasePath()

      if (!fs.existsSync(dbPath)) {
        return { exists: false, path: dbPath }
      }

      const stats = fs.statSync(dbPath)

      // Get record counts
      const db = new Database(dbPath, { readonly: true })

      const leadCount = db.prepare('SELECT COUNT(*) as count FROM leads').get()?.count || 0
      const importCount = db.prepare('SELECT COUNT(*) as count FROM imports').get()?.count || 0
      const contentCount = db.prepare('SELECT COUNT(*) as count FROM generated_content').get()?.count || 0

      db.close()

      return {
        exists: true,
        path: dbPath,
        size: stats.size,
        modified: stats.mtime,
        records: {
          leads: leadCount,
          imports: importCount,
          content: contentCount
        }
      }
    } catch (error) {
      logger.error('Failed to get database info:', error)
      return { exists: false, error: error.message }
    }
  })
}

function maskApiKey(key: string | undefined): string {
  if (!key) return ''
  if (key.length <= 8) return '****'
  return `****...${key.slice(-4)}`
}

// Declare global to avoid TypeScript errors
declare global {
  var anthropicClient: any
}