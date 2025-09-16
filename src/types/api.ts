// Re-export the ElectronAPI interface for use in React components
export type { ElectronAPI } from '../preload/preload';
export type { IpcResponse, IpcErrorResponse, IpcSuccessResponse } from '../main/ipc/utils';

// Re-export all DAL types for frontend use
export type {
  ImportRecord,
  ImportFilters,
  LeadRecord,
  LeadFilters,
  BulkLeadData,
  GeneratedContentRecord,
  ContentFilters,
  MappingRecord,
  MappingFilters,
  BulkMappingData,
  AppMetadataRecord,
  MetadataFilters,
  ImportWithStats,
  LeadWithContent,
  LeadWithImport,
  ContentWithLead,
  SearchFilters,
  ReportingStats,
  PaginationOptions
} from '../database/dal';

// Helper type for API responses
export type ApiResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: {
    type: string;
    message: string;
    code?: string;
    details?: any;
  };
};

// Utility type for handling API calls in React components
export type AsyncApiCall<T> = () => Promise<ApiResult<T>>;

// Common error types that the frontend should handle
export enum ApiErrorType {
  VALIDATION_ERROR = 'ValidationError',
  NOT_FOUND = 'NotFoundError',
  FOREIGN_KEY_ERROR = 'ForeignKeyError',
  UNIQUE_CONSTRAINT = 'UniqueConstraintError',
  TRANSACTION_ERROR = 'TransactionError',
  DATABASE_ERROR = 'DALError',
  UNKNOWN_ERROR = 'UnknownError'
}

// Helper function to check if API response is successful
export function isApiSuccess<T>(response: ApiResult<T>): response is { success: true; data: T } {
  return response.success === true;
}

// Helper function to check if API response is an error
export function isApiError<T>(response: ApiResult<T>): response is { success: false; error: any } {
  return response.success === false;
}
