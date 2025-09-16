import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setupWoodpeckerHandlers, removeWoodpeckerHandlers } from '../../ipc/woodpeckerHandlers'
import * as woodpeckerService from '../../services/woodpeckerService'

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
    listeners: vi.fn()
  }
}))

// Mock the Woodpecker service
vi.mock('../../services/woodpeckerService')
const mockWoodpeckerService = vi.mocked(woodpeckerService)

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  }
}))

// Mock IPC utils
vi.mock('../../ipc/utils', () => ({
  handleIpcError: vi.fn((error, operation) => ({ 
    success: false, 
    error: error.message, 
    operation 
  })),
  createSuccessResponse: vi.fn((data) => ({ 
    success: true, 
    data 
  })),
  logIpcOperation: vi.fn(),
  validateInput: vi.fn(),
  sanitizeInput: vi.fn((input) => input)
}))

describe('WoodpeckerHandlers', () => {
  let mockService: any
  let mockIpcMain: any

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks()

    // Get the mocked ipcMain
    const { ipcMain } = await import('electron')
    mockIpcMain = ipcMain

    // Create mock service instance
    mockService = {
      getCampaigns: vi.fn(),
      addProspectsToCampaign: vi.fn(),
      checkDuplicateProspects: vi.fn(),
      clearCampaignCache: vi.fn(),
      getRequestCount: vi.fn().mockReturnValue(10),
      getRemainingRequests: vi.fn().mockReturnValue(90)
    }

    // Mock the createWoodpeckerService function
    mockWoodpeckerService.createWoodpeckerService.mockReturnValue(mockService)

    // Setup handlers
    setupWoodpeckerHandlers()
  })

  afterEach(() => {
    removeWoodpeckerHandlers()
  })

  describe('getCampaigns handler', () => {
    it('should get campaigns successfully', async () => {
      const mockCampaigns = [
        { campaign_id: 1, name: 'Test Campaign', status: 'active', created_date: '2024-01-01' }
      ]
      mockService.getCampaigns.mockResolvedValue(mockCampaigns)

      // Get the handler function that was registered
      const handleCall = mockIpcMain.handle.mock.calls.find(
        (call: any) => call[0] === 'ipc:woodpecker:getCampaigns'
      )
      expect(handleCall).toBeDefined()

      const handler = handleCall[1]
      const result = await handler({}, { forceRefresh: false })

      expect(mockService.getCampaigns).toHaveBeenCalledWith(false)
      expect(result).toEqual({
        success: true,
        data: mockCampaigns
      })
    })

    it('should handle errors when getting campaigns', async () => {
      const error = new Error('API Error')
      mockService.getCampaigns.mockRejectedValue(error)

      const handleCall = mockIpcMain.handle.mock.calls.find(
        (call: any) => call[0] === 'ipc:woodpecker:getCampaigns'
      )
      const handler = handleCall[1]
      const result = await handler({}, {})

      expect(result).toEqual({
        success: false,
        error: 'API Error',
        operation: 'woodpecker:getCampaigns'
      })
    })
  })

  describe('handler registration', () => {
    it('should register all required handlers', () => {
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'ipc:woodpecker:getCampaigns',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'ipc:woodpecker:addProspects',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'ipc:woodpecker:checkDuplicates',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'ipc:woodpecker:clearCache',
        expect.any(Function)
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'ipc:woodpecker:getQuotaInfo',
        expect.any(Function)
      )
    })

    it('should remove all handlers on cleanup', () => {
      removeWoodpeckerHandlers()

      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith('ipc:woodpecker:getCampaigns')
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith('ipc:woodpecker:addProspects')
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith('ipc:woodpecker:checkDuplicates')
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith('ipc:woodpecker:clearCache')
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith('ipc:woodpecker:getQuotaInfo')
    })
  })
})
