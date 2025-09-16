import { ipcMain } from 'electron'
import { WoodpeckerService, createWoodpeckerService, WoodpeckerApiError } from '../services/woodpeckerService'
import type { WoodpeckerCampaign, WoodpeckerProspect, WoodpeckerExportProgress } from '../services/woodpeckerService'
import { handleIpcError, createSuccessResponse, logIpcOperation, validateInput, sanitizeInput } from './utils'
import { logger } from '../utils/logger'

// Woodpecker service instance
let woodpeckerService: WoodpeckerService | null = null

// Initialize Woodpecker service with error handling
function initializeWoodpeckerService(): WoodpeckerService {
  if (!woodpeckerService) {
    try {
      woodpeckerService = createWoodpeckerService()
      logger.info('WoodpeckerHandlers', 'Woodpecker service initialized successfully')
    } catch (error) {
      logger.error('WoodpeckerHandlers', 'Failed to initialize Woodpecker service', error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }
  return woodpeckerService
}

// Request interface for getting campaigns
export interface WoodpeckerGetCampaignsRequest {
  forceRefresh?: boolean
}

// Request interface for adding prospects
export interface WoodpeckerAddProspectsRequest {
  prospects: WoodpeckerProspect[]
  campaignId: number
  force?: boolean
  onProgress?: (progress: WoodpeckerExportProgress) => void
}

// Request interface for checking duplicates
export interface WoodpeckerCheckDuplicatesRequest {
  emails: string[]
  campaignId: number
}

/**
 * Setup Woodpecker-related IPC handlers
 */
export function setupWoodpeckerHandlers(): void {
  logger.info('WoodpeckerHandlers', 'Setting up Woodpecker IPC handlers...')

  // Get campaigns handler
  ipcMain.handle('ipc:woodpecker:getCampaigns', async (event, request: WoodpeckerGetCampaignsRequest = {}) => {
    logIpcOperation('woodpecker:getCampaigns', { 
      forceRefresh: request.forceRefresh
    })

    try {
      // Sanitize input
      const sanitizedRequest = sanitizeInput(request) as WoodpeckerGetCampaignsRequest
      
      // Initialize Woodpecker service
      const service = initializeWoodpeckerService()

      // Get campaigns
      const campaigns = await service.getCampaigns(sanitizedRequest.forceRefresh)

      logger.info('WoodpeckerHandlers', `Retrieved ${campaigns.length} campaigns successfully`)
      return createSuccessResponse(campaigns)

    } catch (error) {
      logger.error('WoodpeckerHandlers', 'Failed to get campaigns', error instanceof Error ? error : new Error(String(error)))
      return handleIpcError(error, 'woodpecker:getCampaigns')
    }
  })

  // Add prospects to campaign handler
  ipcMain.handle('ipc:woodpecker:addProspects', async (event, request: WoodpeckerAddProspectsRequest) => {
    logIpcOperation('woodpecker:addProspects', { 
      prospectsCount: request.prospects?.length,
      campaignId: request.campaignId,
      force: request.force
    })

    try {
      // Validate required fields
      validateInput(request, ['prospects', 'campaignId'])
      
      // Sanitize input
      const sanitizedRequest = sanitizeInput(request) as WoodpeckerAddProspectsRequest
      
      // Validate prospects array
      if (!Array.isArray(sanitizedRequest.prospects) || sanitizedRequest.prospects.length === 0) {
        throw new Error('Prospects must be a non-empty array')
      }
      
      // Validate campaign ID
      if (!Number.isInteger(sanitizedRequest.campaignId) || sanitizedRequest.campaignId <= 0) {
        throw new Error('Campaign ID must be a positive integer')
      }

      // Validate prospects structure
      for (const prospect of sanitizedRequest.prospects) {
        if (!prospect.email || typeof prospect.email !== 'string') {
          throw new Error('Each prospect must have a valid email address')
        }
        if (!prospect.first_name || typeof prospect.first_name !== 'string') {
          throw new Error('Each prospect must have a valid first name')
        }
      }

      // Initialize Woodpecker service
      const service = initializeWoodpeckerService()

      // Add prospects to campaign
      const progress = await service.addProspectsToCampaign(
        sanitizedRequest.prospects,
        sanitizedRequest.campaignId,
        sanitizedRequest.force,
        sanitizedRequest.onProgress
      )

      logger.info('WoodpeckerHandlers', `Added prospects to campaign successfully: ${progress.succeeded} succeeded, ${progress.failed} failed`)
      return createSuccessResponse(progress)

    } catch (error) {
      logger.error('WoodpeckerHandlers', 'Failed to add prospects', error instanceof Error ? error : new Error(String(error)))
      return handleIpcError(error, 'woodpecker:addProspects')
    }
  })

  // Check duplicate prospects handler
  ipcMain.handle('ipc:woodpecker:checkDuplicates', async (event, request: WoodpeckerCheckDuplicatesRequest) => {
    logIpcOperation('woodpecker:checkDuplicates', { 
      emailCount: request.emails?.length,
      campaignId: request.campaignId
    })

    try {
      // Validate required fields
      validateInput(request, ['emails', 'campaignId'])
      
      // Sanitize input
      const sanitizedRequest = sanitizeInput(request) as WoodpeckerCheckDuplicatesRequest
      
      // Validate emails array
      if (!Array.isArray(sanitizedRequest.emails) || sanitizedRequest.emails.length === 0) {
        throw new Error('Emails must be a non-empty array')
      }
      
      // Validate campaign ID
      if (!Number.isInteger(sanitizedRequest.campaignId) || sanitizedRequest.campaignId <= 0) {
        throw new Error('Campaign ID must be a positive integer')
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      for (const email of sanitizedRequest.emails) {
        if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
          throw new Error(`Invalid email format: ${email}`)
        }
      }

      // Initialize Woodpecker service
      const service = initializeWoodpeckerService()

      // Check for duplicates
      const duplicates = await service.checkDuplicateProspects(
        sanitizedRequest.emails,
        sanitizedRequest.campaignId
      )

      logger.info('WoodpeckerHandlers', `Checked duplicates: ${duplicates.length} found out of ${sanitizedRequest.emails.length} emails`)
      return createSuccessResponse(duplicates)

    } catch (error) {
      logger.error('WoodpeckerHandlers', 'Failed to check duplicates', error instanceof Error ? error : new Error(String(error)))
      return handleIpcError(error, 'woodpecker:checkDuplicates')
    }
  })

  // Clear campaign cache handler
  ipcMain.handle('ipc:woodpecker:clearCache', async (event) => {
    logIpcOperation('woodpecker:clearCache')

    try {
      // Initialize Woodpecker service
      const service = initializeWoodpeckerService()

      // Clear cache
      service.clearCampaignCache()

      logger.info('WoodpeckerHandlers', 'Campaign cache cleared successfully')
      return createSuccessResponse({ success: true })

    } catch (error) {
      logger.error('WoodpeckerHandlers', 'Failed to clear cache', error instanceof Error ? error : new Error(String(error)))
      return handleIpcError(error, 'woodpecker:clearCache')
    }
  })

  // Get quota info handler
  ipcMain.handle('ipc:woodpecker:getQuotaInfo', async (event) => {
    logIpcOperation('woodpecker:getQuotaInfo')

    try {
      // Initialize Woodpecker service
      const service = initializeWoodpeckerService()

      // Get quota information
      const quotaInfo = {
        requestCount: service.getRequestCount(),
        remainingRequests: service.getRemainingRequests(),
        maxRequestsPerMinute: 100
      }

      logger.debug('WoodpeckerHandlers', `Quota info retrieved: ${JSON.stringify(quotaInfo)}`)
      return createSuccessResponse(quotaInfo)

    } catch (error) {
      logger.error('WoodpeckerHandlers', 'Failed to get quota info', error instanceof Error ? error : new Error(String(error)))
      return handleIpcError(error, 'woodpecker:getQuotaInfo')
    }
  })

  logger.info('WoodpeckerHandlers', 'Woodpecker IPC handlers setup complete')
}

/**
 * Remove Woodpecker IPC handlers (useful for cleanup)
 */
export function removeWoodpeckerHandlers(): void {
  logger.info('WoodpeckerHandlers', 'Removing Woodpecker IPC handlers...')
  
  ipcMain.removeHandler('ipc:woodpecker:getCampaigns')
  ipcMain.removeHandler('ipc:woodpecker:addProspects')
  ipcMain.removeHandler('ipc:woodpecker:checkDuplicates')
  ipcMain.removeHandler('ipc:woodpecker:clearCache')
  ipcMain.removeHandler('ipc:woodpecker:getQuotaInfo')
  
  // Reset service instance
  woodpeckerService = null
  
  logger.info('WoodpeckerHandlers', 'Woodpecker IPC handlers removed')
}
