import { DALError, ValidationError, NotFoundError, ForeignKeyError, UniqueConstraintError, TransactionError } from '../../database/dal';
import { WoodpeckerApiError } from '../services/woodpeckerService';
import { logger } from '../utils/logger';

/**
 * Standard error response structure for IPC operations
 */
export interface IpcErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    code?: string;
    details?: any;
  };
}

/**
 * Standard success response structure for IPC operations
 */
export interface IpcSuccessResponse<T = any> {
  success: true;
  data: T;
}

export type IpcResponse<T = any> = IpcSuccessResponse<T> | IpcErrorResponse;

/**
 * Handle errors in IPC operations with proper serialization
 */
export function handleIpcError(error: unknown, operation: string): IpcErrorResponse {
  logger.error('IPC', `Error in ${operation}`, error instanceof Error ? error : new Error(String(error)));
  
  if (error instanceof ValidationError) {
    return {
      success: false,
      error: {
        type: 'ValidationError',
        message: error.message,
        code: 'VALIDATION_FAILED',
        details: error.details
      }
    };
  }
  
  if (error instanceof NotFoundError) {
    return {
      success: false,
      error: {
        type: 'NotFoundError',
        message: error.message,
        code: 'NOT_FOUND'
      }
    };
  }
  
  if (error instanceof ForeignKeyError) {
    return {
      success: false,
      error: {
        type: 'ForeignKeyError',
        message: error.message,
        code: 'FOREIGN_KEY_CONSTRAINT'
      }
    };
  }
  
  if (error instanceof UniqueConstraintError) {
    return {
      success: false,
      error: {
        type: 'UniqueConstraintError',
        message: error.message,
        code: 'UNIQUE_CONSTRAINT'
      }
    };
  }
  
  if (error instanceof TransactionError) {
    return {
      success: false,
      error: {
        type: 'TransactionError',
        message: error.message,
        code: 'TRANSACTION_FAILED'
      }
    };
  }
  
  if (error instanceof DALError) {
    return {
      success: false,
      error: {
        type: 'DALError',
        message: error.message,
        code: 'DATABASE_ERROR'
      }
    };
  }

  if (error instanceof WoodpeckerApiError) {
    return {
      success: false,
      error: {
        type: 'WoodpeckerApiError',
        message: error.message,
        code: `WOODPECKER_${error.category.toUpperCase()}`,
        details: {
          category: error.category,
          retryable: error.retryable
        }
      }
    };
  }

  // Handle generic errors
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  return {
    success: false,
    error: {
      type: 'UnknownError',
      message: errorMessage,
      code: 'UNKNOWN_ERROR'
    }
  };
}

/**
 * Validate required input fields
 */
export function validateInput(data: any, requiredFields: string[]): void {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Input data is required and must be an object');
  }
  
  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });
  
  if (missingFields.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missingFields.join(', ')}`,
      { missingFields }
    );
  }
}

/**
 * Sanitize input data to prevent injection attacks
 */
export function sanitizeInput(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'string') {
    // Basic string sanitization
    return data.trim();
  }
  
  if (typeof data === 'number') {
    // Ensure it's a valid number
    if (isNaN(data) || !isFinite(data)) {
      throw new ValidationError('Invalid number value');
    }
    return data;
  }
  
  if (typeof data === 'boolean') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeInput(item));
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Create a success response
 */
export function createSuccessResponse<T>(data: T): IpcSuccessResponse<T> {
  return {
    success: true,
    data
  };
}

/**
 * Log IPC operation for debugging
 */
export function logIpcOperation(operation: string, args?: any): void {
  logger.debug('IPC', `Operation: ${operation}`, args ? { args } : undefined);
}
