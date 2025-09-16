import type { ApiResult, MappingRecord } from '@/types/api'
import { isApiSuccess, isApiError } from '@/types/api'
import type { ColumnMapping } from '@/types/lead'

// Helper function to convert ColumnMapping to MappingRecord format
function convertColumnMappingToRecord(
  columnMapping: ColumnMapping,
  importId: number,
  name: string = 'CSV Import Mapping'
): Omit<MappingRecord, 'id' | 'created_at' | 'updated_at'> {
  return {
    import_id: importId,
    name,
    source_field: Object.keys(columnMapping).join(','), // Store all source fields
    target_field: Object.values(columnMapping).join(','), // Store all target fields
    transformation_rules: columnMapping, // Store the full mapping as JSON
    is_active: true
  }
}

// Helper function to convert MappingRecord back to ColumnMapping
function convertRecordToColumnMapping(record: MappingRecord): ColumnMapping {
  // If transformation_rules is available, use it directly
  if (record.transformation_rules && typeof record.transformation_rules === 'object') {
    return record.transformation_rules as ColumnMapping
  }
  
  // Fallback: reconstruct from source_field and target_field
  const sourceFields = record.source_field.split(',')
  const targetFields = record.target_field.split(',')
  const mapping: ColumnMapping = {}
  
  sourceFields.forEach((source, index) => {
    if (targetFields[index]) {
      mapping[source.trim()] = targetFields[index].trim()
    }
  })
  
  return mapping
}

export const mappingsStorage = {
  // Create a new mapping
  async createMapping(
    columnMapping: ColumnMapping,
    importId: number,
    name?: string
  ): Promise<MappingRecord | null> {
    try {
      const mappingData = convertColumnMappingToRecord(columnMapping, importId, name)
      const response = await window.api.mappings.create(mappingData)
      
      if (isApiError(response)) {
        console.error('Error creating mapping:', response.error)
        return null
      }
      
      return response.data
    } catch (error) {
      console.error('Error creating mapping:', error)
      return null
    }
  },

  // Get mappings for a specific import
  async getMappingsByImport(importId: number): Promise<MappingRecord[]> {
    try {
      const response = await window.api.mappings.getByImport(importId)
      
      if (isApiError(response)) {
        console.error('Error getting mappings by import:', response.error)
        return []
      }
      
      return response.data
    } catch (error) {
      console.error('Error getting mappings by import:', error)
      return []
    }
  },

  // Get all active mappings
  async getActiveMappings(): Promise<MappingRecord[]> {
    try {
      const response = await window.api.mappings.getActive()
      
      if (isApiError(response)) {
        console.error('Error getting active mappings:', response.error)
        return []
      }
      
      return response.data
    } catch (error) {
      console.error('Error getting active mappings:', error)
      return []
    }
  },

  // Update mapping
  async updateMapping(
    id: number,
    updates: Partial<{
      name: string
      columnMapping: ColumnMapping
      isActive: boolean
    }>
  ): Promise<boolean> {
    try {
      const updateData: Partial<MappingRecord> = {}
      
      if (updates.name !== undefined) {
        updateData.name = updates.name
      }
      
      if (updates.columnMapping !== undefined) {
        updateData.source_field = Object.keys(updates.columnMapping).join(',')
        updateData.target_field = Object.values(updates.columnMapping).join(',')
        updateData.transformation_rules = updates.columnMapping
      }
      
      if (updates.isActive !== undefined) {
        updateData.is_active = updates.isActive
      }
      
      const response = await window.api.mappings.update(id, updateData)
      
      if (isApiError(response)) {
        console.error('Error updating mapping:', response.error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error updating mapping:', error)
      return false
    }
  },

  // Delete mapping
  async deleteMapping(id: number): Promise<boolean> {
    try {
      const response = await window.api.mappings.delete(id)
      
      if (isApiError(response)) {
        console.error('Error deleting mapping:', response.error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error deleting mapping:', error)
      return false
    }
  },

  // Get column mapping for a specific import (convenience method)
  async getColumnMappingForImport(importId: number): Promise<ColumnMapping> {
    try {
      const mappings = await this.getMappingsByImport(importId)
      
      if (mappings.length === 0) {
        return {}
      }
      
      // Return the first active mapping, or the first mapping if none are active
      const activeMapping = mappings.find(m => m.is_active) || mappings[0]
      return convertRecordToColumnMapping(activeMapping)
    } catch (error) {
      console.error('Error getting column mapping for import:', error)
      return {}
    }
  },

  // Save column mapping (creates or updates)
  async saveColumnMapping(
    columnMapping: ColumnMapping,
    importId: number,
    name?: string
  ): Promise<boolean> {
    try {
      // Check if mapping already exists for this import
      const existingMappings = await this.getMappingsByImport(importId)
      
      if (existingMappings.length > 0) {
        // Update the first mapping
        const success = await this.updateMapping(existingMappings[0].id, {
          columnMapping,
          name: name || existingMappings[0].name
        })
        return success
      } else {
        // Create new mapping
        const mapping = await this.createMapping(columnMapping, importId, name)
        return mapping !== null
      }
    } catch (error) {
      console.error('Error saving column mapping:', error)
      return false
    }
  },

  // Get mapping templates (commonly used mappings)
  async getMappingTemplates(): Promise<Array<{
    name: string
    mapping: ColumnMapping
    usageCount: number
  }>> {
    try {
      const activeMappings = await this.getActiveMappings()
      
      // Group mappings by their transformation rules to find common patterns
      const templateMap = new Map<string, {
        name: string
        mapping: ColumnMapping
        usageCount: number
      }>()
      
      activeMappings.forEach(mapping => {
        const columnMapping = convertRecordToColumnMapping(mapping)
        const key = JSON.stringify(columnMapping)
        
        if (templateMap.has(key)) {
          const template = templateMap.get(key)!
          template.usageCount += 1
        } else {
          templateMap.set(key, {
            name: mapping.name,
            mapping: columnMapping,
            usageCount: 1
          })
        }
      })
      
      // Return templates sorted by usage count
      return Array.from(templateMap.values())
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10) // Return top 10 templates
    } catch (error) {
      console.error('Error getting mapping templates:', error)
      return []
    }
  }
}
