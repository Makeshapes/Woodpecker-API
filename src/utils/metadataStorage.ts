import type { ApiResult, AppMetadataRecord } from '@/types/api'
import { isApiSuccess, isApiError } from '@/types/api'

// Type for common metadata keys used in the application
export type MetadataKey = 
  | 'columnMapping'
  | 'userPreferences'
  | 'appSettings'
  | 'lastImportId'
  | 'defaultTemplate'
  | 'apiQuota'
  | 'featureFlags'
  | string // Allow custom keys

// Type for metadata values (can be any JSON-serializable data)
export type MetadataValue = string | number | boolean | object | null

export const metadataStorage = {
  // Get a metadata value by key
  async get(key: MetadataKey): Promise<MetadataValue | null> {
    try {
      const response = await window.api.metadata.get(key)
      
      if (isApiError(response)) {
        console.error('Error getting metadata:', response.error)
        return null
      }
      
      return response.data?.value || null
    } catch (error) {
      console.error('Error getting metadata:', error)
      return null
    }
  },

  // Set a metadata value
  async set(key: MetadataKey, value: MetadataValue): Promise<boolean> {
    try {
      const response = await window.api.metadata.set(key, value)
      
      if (isApiError(response)) {
        console.error('Error setting metadata:', response.error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error setting metadata:', error)
      return false
    }
  },

  // Delete a metadata entry
  async delete(key: MetadataKey): Promise<boolean> {
    try {
      const response = await window.api.metadata.delete(key)
      
      if (isApiError(response)) {
        console.error('Error deleting metadata:', response.error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error deleting metadata:', error)
      return false
    }
  },

  // Get all metadata entries
  async getAll(): Promise<Record<string, MetadataValue>> {
    try {
      const response = await window.api.metadata.getAll()
      
      if (isApiError(response)) {
        console.error('Error getting all metadata:', response.error)
        return {}
      }
      
      // Convert array of records to key-value object
      const metadata: Record<string, MetadataValue> = {}
      response.data.forEach(record => {
        metadata[record.key] = record.value
      })
      
      return metadata
    } catch (error) {
      console.error('Error getting all metadata:', error)
      return {}
    }
  },

  // Get metadata with default value if not found
  async getWithDefault<T extends MetadataValue>(key: MetadataKey, defaultValue: T): Promise<T> {
    try {
      const value = await this.get(key)
      return (value !== null ? value : defaultValue) as T
    } catch (error) {
      console.error('Error getting metadata with default:', error)
      return defaultValue
    }
  },

  // Update metadata (set if exists, create if not)
  async update(key: MetadataKey, value: MetadataValue): Promise<boolean> {
    return await this.set(key, value)
  },

  // Increment a numeric metadata value
  async increment(key: MetadataKey, amount: number = 1): Promise<number | null> {
    try {
      const currentValue = await this.get(key)
      const numericValue = typeof currentValue === 'number' ? currentValue : 0
      const newValue = numericValue + amount
      
      const success = await this.set(key, newValue)
      return success ? newValue : null
    } catch (error) {
      console.error('Error incrementing metadata:', error)
      return null
    }
  },

  // Toggle a boolean metadata value
  async toggle(key: MetadataKey): Promise<boolean | null> {
    try {
      const currentValue = await this.get(key)
      const booleanValue = typeof currentValue === 'boolean' ? currentValue : false
      const newValue = !booleanValue
      
      const success = await this.set(key, newValue)
      return success ? newValue : null
    } catch (error) {
      console.error('Error toggling metadata:', error)
      return null
    }
  },

  // Batch operations
  async setMultiple(entries: Record<MetadataKey, MetadataValue>): Promise<boolean> {
    try {
      const promises = Object.entries(entries).map(([key, value]) => 
        this.set(key, value)
      )
      
      const results = await Promise.all(promises)
      return results.every(result => result === true)
    } catch (error) {
      console.error('Error setting multiple metadata entries:', error)
      return false
    }
  },

  async deleteMultiple(keys: MetadataKey[]): Promise<boolean> {
    try {
      const promises = keys.map(key => this.delete(key))
      const results = await Promise.all(promises)
      return results.every(result => result === true)
    } catch (error) {
      console.error('Error deleting multiple metadata entries:', error)
      return false
    }
  },

  // Utility methods for common metadata operations
  
  // User preferences
  async getUserPreferences(): Promise<Record<string, any>> {
    const prefs = await this.get('userPreferences')
    return typeof prefs === 'object' && prefs !== null ? prefs as Record<string, any> : {}
  },

  async setUserPreference(key: string, value: any): Promise<boolean> {
    const currentPrefs = await this.getUserPreferences()
    const updatedPrefs = { ...currentPrefs, [key]: value }
    return await this.set('userPreferences', updatedPrefs)
  },

  // App settings
  async getAppSettings(): Promise<Record<string, any>> {
    const settings = await this.get('appSettings')
    return typeof settings === 'object' && settings !== null ? settings as Record<string, any> : {}
  },

  async setAppSetting(key: string, value: any): Promise<boolean> {
    const currentSettings = await this.getAppSettings()
    const updatedSettings = { ...currentSettings, [key]: value }
    return await this.set('appSettings', updatedSettings)
  },

  // Feature flags
  async getFeatureFlag(flag: string): Promise<boolean> {
    const flags = await this.get('featureFlags')
    if (typeof flags === 'object' && flags !== null) {
      return (flags as Record<string, boolean>)[flag] || false
    }
    return false
  },

  async setFeatureFlag(flag: string, enabled: boolean): Promise<boolean> {
    const currentFlags = await this.get('featureFlags')
    const flags = typeof currentFlags === 'object' && currentFlags !== null 
      ? currentFlags as Record<string, boolean>
      : {}
    
    const updatedFlags = { ...flags, [flag]: enabled }
    return await this.set('featureFlags', updatedFlags)
  },

  // Clear all metadata (use with caution)
  async clearAll(): Promise<boolean> {
    try {
      const allMetadata = await this.getAll()
      const keys = Object.keys(allMetadata)
      return await this.deleteMultiple(keys)
    } catch (error) {
      console.error('Error clearing all metadata:', error)
      return false
    }
  }
}
