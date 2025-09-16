import { toast } from 'sonner'
import type { ApiResult } from '@/types/api'

// Error types for better categorization
export enum ErrorType {
  NETWORK = 'network',
  DATABASE = 'database',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Enhanced error interface
export interface AppError {
  type: ErrorType
  severity: ErrorSeverity
  message: string
  userMessage: string
  details?: any
  retryable: boolean
  timestamp: Date
}

// Retry configuration
export interface RetryConfig {
  maxAttempts: number
  delayMs: number
  backoffMultiplier: number
  retryCondition?: (error: any) => boolean
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  retryCondition: (error) => {
    // Retry on network errors, timeouts, and temporary database issues
    return error?.type === ErrorType.NETWORK || 
           error?.type === ErrorType.DATABASE ||
           error?.message?.includes('timeout') ||
           error?.message?.includes('connection')
  }
}

// Sleep utility for retry delays
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms))

// Parse API error response to AppError
export function parseApiError(response: ApiResult<any>): AppError {
  if (response && typeof response === 'object' && 'error' in response && response.error) {
    const { error } = response
    
    let type = ErrorType.UNKNOWN
    let severity = ErrorSeverity.MEDIUM
    let userMessage = 'An unexpected error occurred'
    
    // Categorize error based on type
    switch (error.type) {
      case 'ValidationError':
        type = ErrorType.VALIDATION
        severity = ErrorSeverity.LOW
        userMessage = 'Please check your input and try again'
        break
      case 'NotFoundError':
        type = ErrorType.DATABASE
        severity = ErrorSeverity.LOW
        userMessage = 'The requested data was not found'
        break
      case 'ForeignKeyError':
        type = ErrorType.DATABASE
        severity = ErrorSeverity.MEDIUM
        userMessage = 'Data relationship error - please try again'
        break
      case 'UniqueConstraintError':
        type = ErrorType.VALIDATION
        severity = ErrorSeverity.LOW
        userMessage = 'This data already exists'
        break
      case 'DatabaseError':
      case 'DALError':
        type = ErrorType.DATABASE
        severity = ErrorSeverity.HIGH
        userMessage = 'Database error - please try again later'
        break
      default:
        if (error.message?.includes('network') || error.message?.includes('connection')) {
          type = ErrorType.NETWORK
          severity = ErrorSeverity.MEDIUM
          userMessage = 'Network error - please check your connection'
        }
    }
    
    return {
      type,
      severity,
      message: error.message || 'Unknown error',
      userMessage,
      details: error.details,
      retryable: type === ErrorType.NETWORK || type === ErrorType.DATABASE,
      timestamp: new Date()
    }
  }
  
  return {
    type: ErrorType.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    message: 'Unknown API error',
    userMessage: 'An unexpected error occurred',
    retryable: false,
    timestamp: new Date()
  }
}

// Parse generic error to AppError
export function parseGenericError(error: any): AppError {
  let type = ErrorType.UNKNOWN
  let severity = ErrorSeverity.MEDIUM
  let userMessage = 'An unexpected error occurred'
  let retryable = false
  
  const message = error?.message || String(error)
  
  // Categorize based on error message
  if (message.includes('network') || message.includes('fetch')) {
    type = ErrorType.NETWORK
    userMessage = 'Network error - please check your connection'
    retryable = true
  } else if (message.includes('timeout')) {
    type = ErrorType.NETWORK
    severity = ErrorSeverity.HIGH
    userMessage = 'Request timed out - please try again'
    retryable = true
  } else if (message.includes('permission') || message.includes('unauthorized')) {
    type = ErrorType.PERMISSION
    severity = ErrorSeverity.HIGH
    userMessage = 'Permission denied'
    retryable = false
  }
  
  return {
    type,
    severity,
    message,
    userMessage,
    retryable,
    timestamp: new Date()
  }
}

// Retry wrapper function
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: any
  
  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      // Check if we should retry
      const shouldRetry = attempt < finalConfig.maxAttempts && 
                         (finalConfig.retryCondition?.(error) ?? true)
      
      if (!shouldRetry) {
        throw error
      }
      
      // Calculate delay with exponential backoff
      const delay = finalConfig.delayMs * Math.pow(finalConfig.backoffMultiplier, attempt - 1)
      
      console.warn(`Operation failed (attempt ${attempt}/${finalConfig.maxAttempts}), retrying in ${delay}ms:`, error)
      
      await sleep(delay)
    }
  }
  
  throw lastError
}

// Show user-friendly error message
export function showErrorToast(error: AppError, showRetryOption = false): void {
  const message = error.userMessage
  
  switch (error.severity) {
    case ErrorSeverity.LOW:
      toast.info(message)
      break
    case ErrorSeverity.MEDIUM:
      toast.error(message)
      break
    case ErrorSeverity.HIGH:
    case ErrorSeverity.CRITICAL:
      toast.error(message, {
        duration: 10000, // Show longer for critical errors
      })
      break
  }
  
  // Log detailed error for debugging
  console.error('Application error:', {
    type: error.type,
    severity: error.severity,
    message: error.message,
    details: error.details,
    timestamp: error.timestamp
  })
}

// Wrapper for API operations with error handling
export async function handleApiOperation<T>(
  operation: () => Promise<ApiResult<T>>,
  options: {
    retryConfig?: Partial<RetryConfig>
    showToast?: boolean
    fallbackValue?: T
  } = {}
): Promise<T | null> {
  const { retryConfig, showToast = true, fallbackValue } = options
  
  try {
    const result = await withRetry(operation, retryConfig)
    
    if (result && typeof result === 'object' && 'error' in result) {
      const appError = parseApiError(result)
      
      if (showToast) {
        showErrorToast(appError, appError.retryable)
      }
      
      return fallbackValue ?? null
    }
    
    return result.data
  } catch (error) {
    const appError = parseGenericError(error)
    
    if (showToast) {
      showErrorToast(appError, appError.retryable)
    }
    
    return fallbackValue ?? null
  }
}

// Error boundary helper for React components
export function createErrorHandler(componentName: string) {
  return (error: any, errorInfo?: any) => {
    const appError = parseGenericError(error)
    appError.details = { componentName, errorInfo }
    
    console.error(`Error in ${componentName}:`, error, errorInfo)
    showErrorToast(appError)
  }
}
