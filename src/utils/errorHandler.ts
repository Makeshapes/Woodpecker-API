import { toast } from 'sonner'
import type { ApiResult } from '@/types/api'
import { isApiError, ApiErrorType } from '@/types/api'

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories for better organization
export enum ErrorCategory {
  NETWORK = 'network',
  DATABASE = 'database',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  PERMISSION = 'permission',
  BUSINESS_LOGIC = 'business_logic',
  UNKNOWN = 'unknown'
}

// Enhanced error interface
export interface AppError {
  message: string
  category: ErrorCategory
  severity: ErrorSeverity
  code?: string
  details?: any
  timestamp: Date
  context?: Record<string, any>
}

// Error handler configuration
interface ErrorHandlerConfig {
  showToast: boolean
  logToConsole: boolean
  reportToService: boolean
  fallbackMessage: string
}

const DEFAULT_CONFIG: ErrorHandlerConfig = {
  showToast: true,
  logToConsole: true,
  reportToService: false,
  fallbackMessage: 'An unexpected error occurred. Please try again.'
}

// Error message mappings for better user experience
const ERROR_MESSAGES: Record<string, string> = {
  [ApiErrorType.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ApiErrorType.NOT_FOUND]: 'The requested item could not be found.',
  [ApiErrorType.FOREIGN_KEY_ERROR]: 'This action cannot be completed due to related data.',
  [ApiErrorType.UNIQUE_CONSTRAINT]: 'This item already exists.',
  [ApiErrorType.TRANSACTION_ERROR]: 'The operation could not be completed. Please try again.',
  [ApiErrorType.DATABASE_ERROR]: 'A database error occurred. Please try again later.',
  [ApiErrorType.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
}

// Categorize errors based on type
function categorizeError(errorType: string): ErrorCategory {
  switch (errorType) {
    case ApiErrorType.VALIDATION_ERROR:
      return ErrorCategory.VALIDATION
    case ApiErrorType.NOT_FOUND:
      return ErrorCategory.DATABASE
    case ApiErrorType.FOREIGN_KEY_ERROR:
    case ApiErrorType.UNIQUE_CONSTRAINT:
    case ApiErrorType.TRANSACTION_ERROR:
    case ApiErrorType.DATABASE_ERROR:
      return ErrorCategory.DATABASE
    default:
      return ErrorCategory.UNKNOWN
  }
}

// Determine error severity
function determineSeverity(category: ErrorCategory, errorType?: string): ErrorSeverity {
  switch (category) {
    case ErrorCategory.VALIDATION:
      return ErrorSeverity.LOW
    case ErrorCategory.DATABASE:
      return errorType === ApiErrorType.DATABASE_ERROR ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM
    case ErrorCategory.NETWORK:
      return ErrorSeverity.MEDIUM
    case ErrorCategory.AUTHENTICATION:
    case ErrorCategory.PERMISSION:
      return ErrorSeverity.HIGH
    case ErrorCategory.BUSINESS_LOGIC:
      return ErrorSeverity.MEDIUM
    default:
      return ErrorSeverity.MEDIUM
  }
}

// Main error handler class
export class ErrorHandler {
  private config: ErrorHandlerConfig
  private errorLog: AppError[] = []

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // Handle API response errors
  handleApiError<T>(
    response: ApiResult<T>,
    context?: Record<string, any>,
    customMessage?: string
  ): AppError | null {
    if (!isApiError(response)) {
      return null
    }

    const errorType = response.error.type
    const category = categorizeError(errorType)
    const severity = determineSeverity(category, errorType)
    
    const appError: AppError = {
      message: customMessage || ERROR_MESSAGES[errorType] || response.error.message,
      category,
      severity,
      code: response.error.code,
      details: response.error.details,
      timestamp: new Date(),
      context
    }

    this.processError(appError)
    return appError
  }

  // Handle generic errors
  handleError(
    error: Error | string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    context?: Record<string, any>,
    customMessage?: string
  ): AppError {
    const message = error instanceof Error ? error.message : error
    const severity = determineSeverity(category)
    
    const appError: AppError = {
      message: customMessage || message || this.config.fallbackMessage,
      category,
      severity,
      timestamp: new Date(),
      context
    }

    this.processError(appError)
    return appError
  }

  // Process error (log, show toast, report)
  private processError(error: AppError): void {
    // Add to error log
    this.errorLog.push(error)
    
    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100)
    }

    // Log to console
    if (this.config.logToConsole) {
      const logMethod = this.getLogMethod(error.severity)
      logMethod(`[${error.category.toUpperCase()}] ${error.message}`, {
        severity: error.severity,
        code: error.code,
        details: error.details,
        context: error.context,
        timestamp: error.timestamp
      })
    }

    // Show toast notification
    if (this.config.showToast) {
      this.showToast(error)
    }

    // Report to external service (if configured)
    if (this.config.reportToService && error.severity === ErrorSeverity.CRITICAL) {
      this.reportError(error)
    }
  }

  // Get appropriate console log method based on severity
  private getLogMethod(severity: ErrorSeverity): typeof console.log {
    switch (severity) {
      case ErrorSeverity.LOW:
        return console.info
      case ErrorSeverity.MEDIUM:
        return console.warn
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return console.error
      default:
        return console.log
    }
  }

  // Show toast notification based on error severity
  private showToast(error: AppError): void {
    const options = {
      duration: this.getToastDuration(error.severity)
    }

    switch (error.severity) {
      case ErrorSeverity.LOW:
        toast.info(error.message, options)
        break
      case ErrorSeverity.MEDIUM:
        toast.warning(error.message, options)
        break
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        toast.error(error.message, options)
        break
      default:
        toast(error.message, options)
    }
  }

  // Get toast duration based on severity
  private getToastDuration(severity: ErrorSeverity): number {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 3000
      case ErrorSeverity.MEDIUM:
        return 5000
      case ErrorSeverity.HIGH:
        return 7000
      case ErrorSeverity.CRITICAL:
        return 10000
      default:
        return 4000
    }
  }

  // Report error to external service (placeholder)
  private reportError(error: AppError): void {
    // This would integrate with an error reporting service like Sentry
    console.warn('Error reporting not implemented:', error)
  }

  // Get error statistics
  getErrorStats(): {
    total: number
    byCategory: Record<ErrorCategory, number>
    bySeverity: Record<ErrorSeverity, number>
    recent: AppError[]
  } {
    const byCategory = {} as Record<ErrorCategory, number>
    const bySeverity = {} as Record<ErrorSeverity, number>

    // Initialize counters
    Object.values(ErrorCategory).forEach(category => {
      byCategory[category] = 0
    })
    Object.values(ErrorSeverity).forEach(severity => {
      bySeverity[severity] = 0
    })

    // Count errors
    this.errorLog.forEach(error => {
      byCategory[error.category]++
      bySeverity[error.severity]++
    })

    return {
      total: this.errorLog.length,
      byCategory,
      bySeverity,
      recent: this.errorLog.slice(-10) // Last 10 errors
    }
  }

  // Clear error log
  clearErrorLog(): void {
    this.errorLog = []
  }

  // Update configuration
  updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

// Global error handler instance
export const errorHandler = new ErrorHandler()

// Convenience functions for common error handling patterns
export const handleApiResponse = <T>(
  response: ApiResult<T>,
  context?: Record<string, any>,
  customMessage?: string
): T | null => {
  if (isApiError(response)) {
    errorHandler.handleApiError(response, context, customMessage)
    return null
  }
  return response.data
}

export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  context?: Record<string, any>
): Promise<T | null> => {
  try {
    return await operation()
  } catch (error) {
    errorHandler.handleError(
      error instanceof Error ? error : String(error),
      category,
      context
    )
    return null
  }
}

// React hook for error handling (if needed)
export const useErrorHandler = () => {
  return {
    handleApiError: errorHandler.handleApiError.bind(errorHandler),
    handleError: errorHandler.handleError.bind(errorHandler),
    getErrorStats: errorHandler.getErrorStats.bind(errorHandler),
    clearErrorLog: errorHandler.clearErrorLog.bind(errorHandler)
  }
}
