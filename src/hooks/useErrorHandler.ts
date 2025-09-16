import { useState, useCallback } from 'react'
import { 
  AppError, 
  ErrorType, 
  ErrorSeverity, 
  parseApiError, 
  parseGenericError, 
  showErrorToast,
  withRetry,
  type RetryConfig
} from '@/utils/errorHandling'
import type { ApiResult } from '@/types/api'

// Hook state interface
interface ErrorState {
  error: AppError | null
  isLoading: boolean
  hasError: boolean
}

// Hook options
interface UseErrorHandlerOptions {
  showToast?: boolean
  retryConfig?: Partial<RetryConfig>
  onError?: (error: AppError) => void
  onSuccess?: () => void
}

// Hook return type
interface UseErrorHandlerReturn {
  error: AppError | null
  isLoading: boolean
  hasError: boolean
  clearError: () => void
  executeWithErrorHandling: <T>(
    operation: () => Promise<T>,
    options?: {
      showToast?: boolean
      retryConfig?: Partial<RetryConfig>
      fallbackValue?: T
    }
  ) => Promise<T | null>
  executeApiOperation: <T>(
    operation: () => Promise<ApiResult<T>>,
    options?: {
      showToast?: boolean
      retryConfig?: Partial<RetryConfig>
      fallbackValue?: T
    }
  ) => Promise<T | null>
}

// Custom hook for error handling
export function useErrorHandler(options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn {
  const {
    showToast = true,
    retryConfig,
    onError,
    onSuccess
  } = options

  const [state, setState] = useState<ErrorState>({
    error: null,
    isLoading: false,
    hasError: false
  })

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
      hasError: false
    }))
  }, [])

  const setError = useCallback((error: AppError) => {
    setState(prev => ({
      ...prev,
      error,
      hasError: true,
      isLoading: false
    }))

    if (showToast) {
      showErrorToast(error, error.retryable)
    }

    onError?.(error)
  }, [showToast, onError])

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading: loading
    }))
  }, [])

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    operationOptions: {
      showToast?: boolean
      retryConfig?: Partial<RetryConfig>
      fallbackValue?: T
    } = {}
  ): Promise<T | null> => {
    const {
      showToast: opShowToast = showToast,
      retryConfig: opRetryConfig = retryConfig,
      fallbackValue
    } = operationOptions

    try {
      setLoading(true)
      clearError()

      const result = await withRetry(operation, opRetryConfig)
      
      onSuccess?.()
      return result
    } catch (error) {
      const appError = parseGenericError(error)
      
      if (opShowToast) {
        showErrorToast(appError, appError.retryable)
      }
      
      setError(appError)
      return fallbackValue ?? null
    } finally {
      setLoading(false)
    }
  }, [showToast, retryConfig, onError, onSuccess, setError, setLoading, clearError])

  const executeApiOperation = useCallback(async <T>(
    operation: () => Promise<ApiResult<T>>,
    operationOptions: {
      showToast?: boolean
      retryConfig?: Partial<RetryConfig>
      fallbackValue?: T
    } = {}
  ): Promise<T | null> => {
    const {
      showToast: opShowToast = showToast,
      retryConfig: opRetryConfig = retryConfig,
      fallbackValue
    } = operationOptions

    try {
      setLoading(true)
      clearError()

      const result = await withRetry(operation, opRetryConfig)
      
      if ('error' in result) {
        const appError = parseApiError(result)
        
        if (opShowToast) {
          showErrorToast(appError, appError.retryable)
        }
        
        setError(appError)
        return fallbackValue ?? null
      }
      
      onSuccess?.()
      return result.data
    } catch (error) {
      const appError = parseGenericError(error)
      
      if (opShowToast) {
        showErrorToast(appError, appError.retryable)
      }
      
      setError(appError)
      return fallbackValue ?? null
    } finally {
      setLoading(false)
    }
  }, [showToast, retryConfig, onError, onSuccess, setError, setLoading, clearError])

  return {
    error: state.error,
    isLoading: state.isLoading,
    hasError: state.hasError,
    clearError,
    executeWithErrorHandling,
    executeApiOperation
  }
}

// Specialized hooks for common operations

// Hook for lead operations
export function useLeadOperations() {
  return useErrorHandler({
    retryConfig: {
      maxAttempts: 3,
      delayMs: 1000,
      retryCondition: (error) => 
        error?.type === ErrorType.NETWORK || 
        error?.type === ErrorType.DATABASE
    }
  })
}

// Hook for content operations
export function useContentOperations() {
  return useErrorHandler({
    retryConfig: {
      maxAttempts: 2,
      delayMs: 500,
      retryCondition: (error) => 
        error?.type === ErrorType.NETWORK
    }
  })
}

// Hook for import operations
export function useImportOperations() {
  return useErrorHandler({
    retryConfig: {
      maxAttempts: 3,
      delayMs: 2000,
      retryCondition: (error) => 
        error?.type === ErrorType.NETWORK || 
        error?.type === ErrorType.DATABASE
    }
  })
}

// Hook for metadata operations
export function useMetadataOperations() {
  return useErrorHandler({
    retryConfig: {
      maxAttempts: 2,
      delayMs: 500
    }
  })
}
