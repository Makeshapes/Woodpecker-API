import type { ApiResult, ImportRecord } from '@/types/api'
import { isApiSuccess, isApiError } from '@/types/api'
import type { CsvData, ColumnMapping } from '@/types/lead'

// Helper function to convert CSV import data to ImportRecord format
function convertCsvDataToImportRecord(
  csvData: CsvData,
  columnMapping: ColumnMapping,
  filename: string
): Omit<ImportRecord, 'id' | 'created_at' | 'updated_at'> {
  return {
    filename,
    total_records: csvData.data.length,
    successful_records: csvData.data.length, // Initially all are successful
    failed_records: 0,
    status: 'completed',
    metadata: {
      columnMapping,
      headers: csvData.headers,
      originalData: csvData
    }
  }
}

export const importsStorage = {
  // Create a new import record
  async createImport(
    csvData: CsvData,
    columnMapping: ColumnMapping,
    filename: string
  ): Promise<ImportRecord | null> {
    try {
      const importData = convertCsvDataToImportRecord(csvData, columnMapping, filename)
      const response = await window.api.imports.create(importData)
      
      if (isApiError(response)) {
        console.error('Error creating import:', response.error)
        return null
      }
      
      return response.data
    } catch (error) {
      console.error('Error creating import:', error)
      return null
    }
  },

  // Get all imports
  async getAllImports(): Promise<ImportRecord[]> {
    try {
      const response = await window.api.imports.getAll()
      
      if (isApiError(response)) {
        console.error('Error getting imports:', response.error)
        return []
      }
      
      return response.data
    } catch (error) {
      console.error('Error getting imports:', error)
      return []
    }
  },

  // Get import by ID
  async getImportById(id: number): Promise<ImportRecord | null> {
    try {
      const response = await window.api.imports.getById(id)
      
      if (isApiError(response)) {
        console.error('Error getting import by ID:', response.error)
        return null
      }
      
      return response.data
    } catch (error) {
      console.error('Error getting import by ID:', error)
      return null
    }
  },

  // Update import status
  async updateImportStatus(
    id: number,
    status: ImportRecord['status'],
    successfulRecords?: number,
    failedRecords?: number
  ): Promise<boolean> {
    try {
      const updateData: Partial<ImportRecord> = { status }
      
      if (successfulRecords !== undefined) {
        updateData.successful_records = successfulRecords
      }
      
      if (failedRecords !== undefined) {
        updateData.failed_records = failedRecords
      }
      
      const response = await window.api.imports.update(id, updateData)
      
      if (isApiError(response)) {
        console.error('Error updating import status:', response.error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error updating import status:', error)
      return false
    }
  },

  // Delete import
  async deleteImport(id: number): Promise<boolean> {
    try {
      const response = await window.api.imports.delete(id)
      
      if (isApiError(response)) {
        console.error('Error deleting import:', response.error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error deleting import:', error)
      return false
    }
  },

  // Get import statistics
  async getImportStats(): Promise<{
    totalImports: number
    totalRecords: number
    successfulRecords: number
    failedRecords: number
  }> {
    try {
      const imports = await this.getAllImports()
      
      const stats = imports.reduce(
        (acc, importRecord) => {
          acc.totalImports += 1
          acc.totalRecords += importRecord.total_records
          acc.successfulRecords += importRecord.successful_records
          acc.failedRecords += importRecord.failed_records
          return acc
        },
        {
          totalImports: 0,
          totalRecords: 0,
          successfulRecords: 0,
          failedRecords: 0
        }
      )
      
      return stats
    } catch (error) {
      console.error('Error getting import stats:', error)
      return {
        totalImports: 0,
        totalRecords: 0,
        successfulRecords: 0,
        failedRecords: 0
      }
    }
  },

  // Get recent imports (last 10)
  async getRecentImports(): Promise<ImportRecord[]> {
    try {
      const response = await window.api.imports.getAll({ limit: 10, orderBy: 'created_at', orderDirection: 'desc' })
      
      if (isApiError(response)) {
        console.error('Error getting recent imports:', response.error)
        return []
      }
      
      return response.data
    } catch (error) {
      console.error('Error getting recent imports:', error)
      return []
    }
  }
}
