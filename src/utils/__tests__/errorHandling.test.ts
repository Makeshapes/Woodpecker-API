import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  parseApiError,
  parseGenericError,
  withRetry,
  handleApiOperation,
  ErrorType,
  ErrorSeverity
} from '../errorHandling'
import type { ApiResult } from '@/types/api'

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

describe('errorHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('parseApiError', () => {
    it('parses validation errors correctly', () => {
      const apiError: ApiResult<any> = {
        error: {
          type: 'ValidationError',
          message: 'Invalid input data',
          details: { field: 'email' }
        }
      }

      const result = parseApiError(apiError)

      expect(result.type).toBe(ErrorType.VALIDATION)
      expect(result.severity).toBe(ErrorSeverity.LOW)
      expect(result.userMessage).toBe('Please check your input and try again')
      expect(result.retryable).toBe(false)
    })

    it('parses database errors correctly', () => {
      const apiError: ApiResult<any> = {
        error: {
          type: 'DatabaseError',
          message: 'Connection failed',
          details: {}
        }
      }

      const result = parseApiError(apiError)

      expect(result.type).toBe(ErrorType.DATABASE)
      expect(result.severity).toBe(ErrorSeverity.HIGH)
      expect(result.userMessage).toBe('Database error - please try again later')
      expect(result.retryable).toBe(true)
    })

    it('parses network errors correctly', () => {
      const apiError: ApiResult<any> = {
        error: {
          type: 'UnknownError',
          message: 'network connection failed',
          details: {}
        }
      }

      const result = parseApiError(apiError)

      expect(result.type).toBe(ErrorType.NETWORK)
      expect(result.severity).toBe(ErrorSeverity.MEDIUM)
      expect(result.userMessage).toBe('Network error - please check your connection')
      expect(result.retryable).toBe(true)
    })

    it('handles unknown errors', () => {
      const apiError: ApiResult<any> = {
        error: {
          type: 'UnknownError',
          message: 'Something went wrong',
          details: {}
        }
      }

      const result = parseApiError(apiError)

      expect(result.type).toBe(ErrorType.UNKNOWN)
      expect(result.severity).toBe(ErrorSeverity.MEDIUM)
      expect(result.userMessage).toBe('An unexpected error occurred')
    })
  })

  describe('parseGenericError', () => {
    it('parses network errors from error messages', () => {
      const error = new Error('fetch failed due to network issues')

      const result = parseGenericError(error)

      expect(result.type).toBe(ErrorType.NETWORK)
      expect(result.userMessage).toBe('Network error - please check your connection')
      expect(result.retryable).toBe(true)
    })

    it('parses timeout errors', () => {
      const error = new Error('Request timeout after 30 seconds')

      const result = parseGenericError(error)

      expect(result.type).toBe(ErrorType.NETWORK)
      expect(result.severity).toBe(ErrorSeverity.HIGH)
      expect(result.userMessage).toBe('Request timed out - please try again')
      expect(result.retryable).toBe(true)
    })

    it('parses permission errors', () => {
      const error = new Error('permission denied for this operation')

      const result = parseGenericError(error)

      expect(result.type).toBe(ErrorType.PERMISSION)
      expect(result.severity).toBe(ErrorSeverity.HIGH)
      expect(result.userMessage).toBe('Permission denied')
      expect(result.retryable).toBe(false)
    })

    it('handles unknown errors', () => {
      const error = new Error('Something unexpected happened')

      const result = parseGenericError(error)

      expect(result.type).toBe(ErrorType.UNKNOWN)
      expect(result.severity).toBe(ErrorSeverity.MEDIUM)
      expect(result.userMessage).toBe('An unexpected error occurred')
      expect(result.retryable).toBe(false)
    })
  })

  describe('withRetry', () => {
    it('succeeds on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success')

      const result = await withRetry(operation)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('retries on failure and eventually succeeds', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success')

      const result = await withRetry(operation, { maxAttempts: 3, delayMs: 1 })

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('throws error after max attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Persistent failure'))

      await expect(withRetry(operation, { maxAttempts: 2, delayMs: 1 }))
        .rejects.toThrow('Persistent failure')

      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('respects retry condition', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Non-retryable error'))

      await expect(withRetry(operation, {
        maxAttempts: 3,
        delayMs: 1,
        retryCondition: () => false
      })).rejects.toThrow('Non-retryable error')

      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('implements exponential backoff', async () => {
      vi.useFakeTimers()
      
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success')

      const promise = withRetry(operation, {
        maxAttempts: 3,
        delayMs: 100,
        backoffMultiplier: 2
      })

      // First call happens immediately
      expect(operation).toHaveBeenCalledTimes(1)

      // Advance by first delay (100ms)
      vi.advanceTimersByTime(100)
      await Promise.resolve() // Allow promise to resolve
      expect(operation).toHaveBeenCalledTimes(2)

      // Advance by second delay (200ms)
      vi.advanceTimersByTime(200)
      await Promise.resolve()
      expect(operation).toHaveBeenCalledTimes(3)

      const result = await promise
      expect(result).toBe('success')

      vi.useRealTimers()
    })
  })

  describe('handleApiOperation', () => {
    it('handles successful API operation', async () => {
      const operation = vi.fn().mockResolvedValue({ data: 'success' })

      const result = await handleApiOperation(operation)

      expect(result).toBe('success')
    })

    it('handles API error response', async () => {
      const operation = vi.fn().mockResolvedValue({
        error: {
          type: 'ValidationError',
          message: 'Invalid data',
          details: {}
        }
      })

      const result = await handleApiOperation(operation)

      expect(result).toBeNull()
    })

    it('returns fallback value on error', async () => {
      const operation = vi.fn().mockResolvedValue({
        error: {
          type: 'DatabaseError',
          message: 'Connection failed',
          details: {}
        }
      })

      const result = await handleApiOperation(operation, {
        fallbackValue: 'fallback'
      })

      expect(result).toBe('fallback')
    })

    it('handles thrown exceptions', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await handleApiOperation(operation)

      expect(result).toBeNull()
    })

    it('retries failed operations', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue({ data: 'success' })

      const result = await handleApiOperation(operation, {
        retryConfig: { maxAttempts: 2, delayMs: 1 }
      })

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })
  })
})
