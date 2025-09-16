import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useErrorHandler, useLeadOperations, useContentOperations } from '../useErrorHandler'
import type { ApiResult } from '@/types/api'

// Mock the error handling utilities
vi.mock('@/utils/errorHandling', () => ({
  parseApiError: vi.fn().mockReturnValue({
    type: 'database',
    severity: 'medium',
    message: 'Database error',
    userMessage: 'Database error occurred',
    retryable: true,
    timestamp: new Date()
  }),
  parseGenericError: vi.fn().mockReturnValue({
    type: 'unknown',
    severity: 'medium',
    message: 'Unknown error',
    userMessage: 'An error occurred',
    retryable: false,
    timestamp: new Date()
  }),
  showErrorToast: vi.fn(),
  withRetry: vi.fn().mockImplementation((operation) => operation()),
  ErrorType: {
    NETWORK: 'network',
    DATABASE: 'database',
    VALIDATION: 'validation',
    PERMISSION: 'permission',
    UNKNOWN: 'unknown'
  },
  ErrorSeverity: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  }
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useErrorHandler())

    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.hasError).toBe(false)
  })

  it('clears error when clearError is called', async () => {
    const { result } = renderHook(() => useErrorHandler())

    // First, set an error by executing a failing operation
    await act(async () => {
      await result.current.executeWithErrorHandling(
        () => Promise.reject(new Error('Test error'))
      )
    })

    expect(result.current.hasError).toBe(true)

    // Clear the error
    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
    expect(result.current.hasError).toBe(false)
  })

  it('executes operation successfully', async () => {
    const { result } = renderHook(() => useErrorHandler())
    const operation = vi.fn().mockResolvedValue('success')

    let operationResult: any
    await act(async () => {
      operationResult = await result.current.executeWithErrorHandling(operation)
    })

    expect(operationResult).toBe('success')
    expect(result.current.error).toBeNull()
    expect(result.current.hasError).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('handles operation failure', async () => {
    const { result } = renderHook(() => useErrorHandler())
    const operation = vi.fn().mockRejectedValue(new Error('Test error'))

    let operationResult: any
    await act(async () => {
      operationResult = await result.current.executeWithErrorHandling(operation)
    })

    expect(operationResult).toBeNull()
    expect(result.current.hasError).toBe(true)
    expect(result.current.error).toBeTruthy()
    expect(result.current.isLoading).toBe(false)
  })

  it('shows loading state during operation', async () => {
    const { result } = renderHook(() => useErrorHandler())
    const operation = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('success'), 100))
    )

    const promise = act(async () => {
      return result.current.executeWithErrorHandling(operation)
    })

    // Check loading state
    expect(result.current.isLoading).toBe(true)

    await promise

    expect(result.current.isLoading).toBe(false)
  })

  it('returns fallback value on error', async () => {
    const { result } = renderHook(() => useErrorHandler())
    const operation = vi.fn().mockRejectedValue(new Error('Test error'))

    let operationResult: any
    await act(async () => {
      operationResult = await result.current.executeWithErrorHandling(operation, {
        fallbackValue: 'fallback'
      })
    })

    expect(operationResult).toBe('fallback')
  })

  it('calls onError callback when error occurs', async () => {
    const onError = vi.fn()
    const { result } = renderHook(() => useErrorHandler({ onError }))
    const operation = vi.fn().mockRejectedValue(new Error('Test error'))

    await act(async () => {
      await result.current.executeWithErrorHandling(operation)
    })

    expect(onError).toHaveBeenCalled()
  })

  it('calls onSuccess callback when operation succeeds', async () => {
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useErrorHandler({ onSuccess }))
    const operation = vi.fn().mockResolvedValue('success')

    await act(async () => {
      await result.current.executeWithErrorHandling(operation)
    })

    expect(onSuccess).toHaveBeenCalled()
  })

  describe('executeApiOperation', () => {
    it('handles successful API response', async () => {
      const { result } = renderHook(() => useErrorHandler())
      const operation = vi.fn().mockResolvedValue({ data: 'api-success' })

      let operationResult: any
      await act(async () => {
        operationResult = await result.current.executeApiOperation(operation)
      })

      expect(operationResult).toBe('api-success')
      expect(result.current.hasError).toBe(false)
    })

    it('handles API error response', async () => {
      const { result } = renderHook(() => useErrorHandler())
      const operation = vi.fn().mockResolvedValue({
        error: {
          type: 'ValidationError',
          message: 'Invalid data',
          details: {}
        }
      })

      let operationResult: any
      await act(async () => {
        operationResult = await result.current.executeApiOperation(operation)
      })

      expect(operationResult).toBeNull()
      expect(result.current.hasError).toBe(true)
    })
  })
})

describe('specialized hooks', () => {
  it('useLeadOperations returns configured hook', () => {
    const { result } = renderHook(() => useLeadOperations())

    expect(result.current.executeApiOperation).toBeDefined()
    expect(result.current.executeWithErrorHandling).toBeDefined()
    expect(result.current.clearError).toBeDefined()
  })

  it('useContentOperations returns configured hook', () => {
    const { result } = renderHook(() => useContentOperations())

    expect(result.current.executeApiOperation).toBeDefined()
    expect(result.current.executeWithErrorHandling).toBeDefined()
    expect(result.current.clearError).toBeDefined()
  })
})
