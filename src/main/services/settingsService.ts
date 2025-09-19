import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { logger } from '../utils/logger'

interface AppSettings {
  claudeApiKey?: string
  woodpeckerApiKey?: string
}

class SettingsService {
  private settingsPath: string
  private settings: AppSettings = {}
  private encryptionKey: string

  constructor() {
    // Store settings in user data directory
    const userDataPath = app.getPath('userData')
    this.settingsPath = path.join(userDataPath, 'settings.json')

    // Generate a machine-specific encryption key
    this.encryptionKey = this.getMachineKey()

    this.loadSettings()
  }

  private getMachineKey(): string {
    // Use machine ID for encryption (not perfect but better than plaintext)
    const machineId = app.getPath('userData')
    return crypto.createHash('sha256').update(machineId).digest('hex').substring(0, 32)
  }

  private encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv)
      let encrypted = cipher.update(text)
      encrypted = Buffer.concat([encrypted, cipher.final()])
      return iv.toString('hex') + ':' + encrypted.toString('hex')
    } catch (error) {
      logger.error('Failed to encrypt text:', error)
      return text
    }
  }

  private decrypt(text: string): string {
    try {
      const parts = text.split(':')
      if (parts.length !== 2) return text

      const iv = Buffer.from(parts[0], 'hex')
      const encryptedText = Buffer.from(parts[1], 'hex')
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv)
      let decrypted = decipher.update(encryptedText)
      decrypted = Buffer.concat([decrypted, decipher.final()])
      return decrypted.toString()
    } catch (error) {
      logger.error('Failed to decrypt text:', error)
      return ''
    }
  }

  private loadSettings(): void {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf8')
        const encrypted = JSON.parse(data)

        // Decrypt API keys
        this.settings = {
          claudeApiKey: encrypted.claudeApiKey ? this.decrypt(encrypted.claudeApiKey) : undefined,
          woodpeckerApiKey: encrypted.woodpeckerApiKey ? this.decrypt(encrypted.woodpeckerApiKey) : undefined,
        }

        logger.info('Settings loaded successfully')
      } else {
        logger.info('No settings file found, using defaults')
      }
    } catch (error) {
      logger.error('Failed to load settings:', error)
      this.settings = {}
    }

    // Fallback to environment variables if no settings are configured
    if (!this.settings.claudeApiKey && process.env.CLAUDE_API_KEY) {
      this.settings.claudeApiKey = process.env.CLAUDE_API_KEY
    }
    if (!this.settings.woodpeckerApiKey && process.env.WOODPECKER_API_KEY) {
      this.settings.woodpeckerApiKey = process.env.WOODPECKER_API_KEY
    }
  }

  private saveSettings(): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.settingsPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // Encrypt sensitive data
      const encrypted = {
        claudeApiKey: this.settings.claudeApiKey ? this.encrypt(this.settings.claudeApiKey) : undefined,
        woodpeckerApiKey: this.settings.woodpeckerApiKey ? this.encrypt(this.settings.woodpeckerApiKey) : undefined,
      }

      fs.writeFileSync(this.settingsPath, JSON.stringify(encrypted, null, 2))
      logger.info('Settings saved successfully')
    } catch (error) {
      logger.error('Failed to save settings:', error)
      throw error
    }
  }

  public getClaudeApiKey(): string | undefined {
    return this.settings.claudeApiKey
  }

  public getWoodpeckerApiKey(): string | undefined {
    return this.settings.woodpeckerApiKey
  }

  public updateApiKeys(keys: Partial<AppSettings>): void {
    if (keys.claudeApiKey !== undefined) {
      this.settings.claudeApiKey = keys.claudeApiKey || undefined
    }
    if (keys.woodpeckerApiKey !== undefined) {
      this.settings.woodpeckerApiKey = keys.woodpeckerApiKey || undefined
    }
    this.saveSettings()
  }

  public validateApiKeys(): { claude: boolean; woodpecker: boolean } {
    return {
      claude: !!this.settings.claudeApiKey,
      woodpecker: !!this.settings.woodpeckerApiKey
    }
  }

  public getSettingsPath(): string {
    return this.settingsPath
  }
}

export const settingsService = new SettingsService()