import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { app, BrowserWindow } from 'electron'
import path from 'path'

// Mock environment variables for testing
process.env.WOODPECKER_API_KEY = 'test-api-key-123'

describe('Woodpecker IPC Integration', () => {
  let mainWindow: BrowserWindow

  beforeAll(async () => {
    // Initialize Electron app for testing
    await app.whenReady()
    
    // Create a test window
    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../../preload/preload.ts')
      }
    })
  })

  afterAll(async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close()
    }
    await app.quit()
  })

  it('should have Woodpecker IPC methods available in preload', async () => {
    // Load a simple HTML page to test the preload script
    await mainWindow.loadURL('data:text/html,<html><body>Test</body></html>')
    
    // Test that the API is exposed
    const hasWoodpeckerAPI = await mainWindow.webContents.executeJavaScript(`
      typeof window.api !== 'undefined' && 
      typeof window.api.woodpecker !== 'undefined' &&
      typeof window.api.woodpecker.getCampaigns === 'function' &&
      typeof window.api.woodpecker.addProspects === 'function' &&
      typeof window.api.woodpecker.checkDuplicates === 'function' &&
      typeof window.api.woodpecker.clearCache === 'function' &&
      typeof window.api.woodpecker.getQuotaInfo === 'function'
    `)
    
    expect(hasWoodpeckerAPI).toBe(true)
  })

  it('should handle getCampaigns IPC call', async () => {
    await mainWindow.loadURL('data:text/html,<html><body>Test</body></html>')
    
    // Test getCampaigns call
    const result = await mainWindow.webContents.executeJavaScript(`
      window.api.woodpecker.getCampaigns().then(response => {
        return {
          success: response.success,
          hasData: response.success && Array.isArray(response.data),
          errorType: !response.success ? typeof response.error : null
        }
      }).catch(error => {
        return { success: false, error: error.message }
      })
    `)
    
    // Should return a response structure (success or error)
    expect(result).toHaveProperty('success')
    if (result.success) {
      expect(result.hasData).toBe(true)
    } else {
      expect(result.errorType).toBe('string')
    }
  })

  it('should handle getQuotaInfo IPC call', async () => {
    await mainWindow.loadURL('data:text/html,<html><body>Test</body></html>')
    
    // Test getQuotaInfo call
    const result = await mainWindow.webContents.executeJavaScript(`
      window.api.woodpecker.getQuotaInfo().then(response => {
        return {
          success: response.success,
          hasQuotaData: response.success && 
            typeof response.data === 'object' &&
            typeof response.data.requestCount === 'number' &&
            typeof response.data.remainingRequests === 'number' &&
            typeof response.data.maxRequestsPerMinute === 'number'
        }
      }).catch(error => {
        return { success: false, error: error.message }
      })
    `)
    
    expect(result.success).toBe(true)
    expect(result.hasQuotaData).toBe(true)
  })

  it('should validate addProspects request structure', async () => {
    await mainWindow.loadURL('data:text/html,<html><body>Test</body></html>')
    
    // Test addProspects with invalid data to check validation
    const result = await mainWindow.webContents.executeJavaScript(`
      window.api.woodpecker.addProspects({
        prospects: [],
        campaignId: -1
      }).then(response => {
        return { success: response.success, error: response.error }
      }).catch(error => {
        return { success: false, error: error.message }
      })
    `)
    
    // Should fail validation
    expect(result.success).toBe(false)
    expect(result.error).toContain('prospects')
  })

  it('should validate checkDuplicates request structure', async () => {
    await mainWindow.loadURL('data:text/html,<html><body>Test</body></html>')
    
    // Test checkDuplicates with invalid email format
    const result = await mainWindow.webContents.executeJavaScript(`
      window.api.woodpecker.checkDuplicates({
        emails: ['invalid-email'],
        campaignId: 1
      }).then(response => {
        return { success: response.success, error: response.error }
      }).catch(error => {
        return { success: false, error: error.message }
      })
    `)
    
    // Should fail validation due to invalid email format
    expect(result.success).toBe(false)
    expect(result.error).toContain('email')
  })
})
