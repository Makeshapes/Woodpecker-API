import { ipcMain } from 'electron'
import { settingsService } from '../services/settingsService'
import { logger } from '../utils/logger'

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
      const response = await fetch('https://api.woodpecker.co/rest/v1/campaigns', {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
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