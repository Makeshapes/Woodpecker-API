import type { LeadData, ColumnMapping } from '@/types/lead'
import type { ApiResult, LeadRecord, BulkLeadData } from '@/types/api'
import { isApiSuccess, isApiError } from '@/types/api'
import { mapCsvRowToLead } from '@/utils/fieldMapper'

// Legacy interface for backward compatibility
export interface LeadsStorage {
  leads: LeadData[]
  columnMapping: ColumnMapping
  lastUpdated: string
  skippedDuplicates?: number
}

// Helper function to convert LeadRecord to LeadData
function convertLeadRecordToLeadData(record: LeadRecord): LeadData {
  const additionalFields = record.additional_fields
    ? JSON.parse(record.additional_fields)
    : {}

  // Build the full name from first_name and last_name
  const fullName = [record.first_name, record.last_name]
    .filter(Boolean)
    .join(' ') || undefined

  return {
    id: record.id?.toString() || '',
    status: mapDbStatusToLeadStatus(record.status || 'imported'),
    // Core fields
    company: record.company || undefined,
    email: record.email || undefined,
    title: record.title || undefined,
    // Name fields - provide both formats for compatibility
    contact_name: fullName,
    first_name: record.first_name || undefined,
    last_name: record.last_name || undefined,
    // Additional Woodpecker fields
    phone: record.phone || undefined,
    website: record.website || undefined,
    linkedin_url: record.linkedin_url || undefined,
    address: record.address || undefined,
    city: record.city || undefined,
    state: record.state || undefined,
    country: record.country || undefined,
    industry: record.industry || undefined,
    tags: record.tags || undefined,
    // Snippets
    snippet1: record.snippet1 || undefined,
    snippet2: record.snippet2 || undefined,
    snippet3: record.snippet3 || undefined,
    snippet4: record.snippet4 || undefined,
    snippet5: record.snippet5 || undefined,
    snippet6: record.snippet6 || undefined,
    snippet7: record.snippet7 || undefined,
    snippet8: record.snippet8 || undefined,
    snippet9: record.snippet9 || undefined,
    snippet10: record.snippet10 || undefined,
    snippet11: record.snippet11 || undefined,
    snippet12: record.snippet12 || undefined,
    snippet13: record.snippet13 || undefined,
    snippet14: record.snippet14 || undefined,
    snippet15: record.snippet15 || undefined,
    // Any remaining custom fields
    ...additionalFields,
    selected: false
  }
}

// Helper function to map database status to LeadStatus
function mapDbStatusToLeadStatus(dbStatus: LeadRecord['status']): LeadData['status'] {
  // Now that both systems use the same status values, return as-is
  return dbStatus || 'imported'
}

// Helper function to convert LeadData to LeadRecord format
function convertLeadDataToRecord(lead: LeadData, importId?: number): Omit<LeadRecord, 'id' | 'import_id' | 'created_at'> {
  const { id, status, selected, ...data } = lead

  // Use the field mapper to convert the lead data to the proper schema
  const mappedLead = mapCsvRowToLead(data)

  return {
    ...mappedLead,
    status: mapLeadStatus(status || 'imported'),
    woodpecker_campaign_id: undefined,
    export_date: undefined
  }
}

// Helper function to map LeadStatus to database status
function mapLeadStatus(leadStatus: LeadData['status']): LeadRecord['status'] {
  // Now that both systems use the same status values, return as-is
  return leadStatus
}

export const leadsStorage = {
  // Get all leads from database via IPC
  async getLeads(): Promise<LeadsStorage | null> {
    try {
      // Check if we're in Electron environment
      if (typeof window === 'undefined' || !window.api) {
        console.warn('Electron API not available, using localStorage fallback')
        // Fallback to localStorage for browser environment
        const stored = localStorage.getItem('leads_storage')
        return stored ? JSON.parse(stored) : null
      }

      const response = await window.api.leads.getAll()

      if (isApiError(response)) {
        console.error('Error loading leads from database:', response.error)
        return null
      }

      // Handle undefined/null data
      if (!response.data || !Array.isArray(response.data)) {
        console.warn('No data returned from database, returning empty state')
        return {
          leads: [],
          columnMapping: {},
          lastUpdated: new Date().toISOString(),
        }
      }

      const leads = response.data.map(convertLeadRecordToLeadData)
      
      // Get column mapping from metadata
      const mappingResponse = await window.api.metadata.get('columnMapping')
      const columnMapping = isApiSuccess(mappingResponse) ? mappingResponse.data?.value || {} : {}
      
      return {
        leads,
        columnMapping,
        lastUpdated: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Error loading leads from database:', error)
      return null
    }
  },

  // Save leads to database via IPC
  async saveLeads(leads: LeadData[], columnMapping: ColumnMapping): Promise<boolean> {
    try {
      // Check if we're in Electron environment
      if (!window.api) {
        // Fallback to localStorage
        const storage: LeadsStorage = {
          leads,
          columnMapping,
          lastUpdated: new Date().toISOString()
        }
        localStorage.setItem('leads_storage', JSON.stringify(storage))
        return true
      }

      // Save column mapping to metadata
      const mappingResponse = await window.api.metadata.set('columnMapping', columnMapping)
      if (isApiError(mappingResponse)) {
        console.error('Error saving column mapping:', mappingResponse.error)
        return false
      }
      
      // For now, we'll assume leads are already in the database
      // This method is mainly used for backward compatibility
      return true
    } catch (error) {
      console.error('Error saving leads to database:', error)
      return false
    }
  },

  // Add new leads (from import) to database, skipping duplicate emails
  async addLeads(newLeads: LeadData[], newColumnMapping: ColumnMapping, importId?: number): Promise<LeadsStorage> {
    try {
      // Check if we're in Electron environment
      if (!window.api) {
        // Fallback to localStorage
        const existing = localStorage.getItem('leads_storage')
        const current: LeadsStorage = existing ? JSON.parse(existing) : { leads: [], columnMapping: {}, lastUpdated: new Date().toISOString() }

        // Simple duplicate detection by email
        const existingEmails = new Set(current.leads.map(l => l.email?.toLowerCase()))
        const uniqueNewLeads = newLeads.filter(lead => !existingEmails.has(lead.email?.toLowerCase()))
        const skipped = newLeads.length - uniqueNewLeads.length

        const updated: LeadsStorage = {
          leads: [...current.leads, ...uniqueNewLeads],
          columnMapping: newColumnMapping,
          lastUpdated: new Date().toISOString(),
          skippedDuplicates: skipped
        }
        localStorage.setItem('leads_storage', JSON.stringify(updated))
        return updated
      }

      // Save column mapping to metadata
      await window.api.metadata.set('columnMapping', newColumnMapping)
      
      // Convert leads to bulk format for database insertion
      const bulkLeads: BulkLeadData = {
        import_id: importId || 1, // Use provided import ID or default to 1
        leads: newLeads.map(lead => convertLeadDataToRecord(lead, importId))
      }

      console.log('bulkCreate payload:', JSON.stringify(bulkLeads, null, 2))
      console.log('newLeads count:', newLeads.length)
      console.log('bulkLeads.leads count:', bulkLeads.leads.length)

      // Use bulk create which handles duplicate detection
      const response = await window.api.leads.bulkCreate(bulkLeads)
      
      if (isApiError(response)) {
        console.error('Error adding leads to database:', response.error)
        // Return current state on error
        const current = await this.getLeads()
        return current || { leads: [], columnMapping: newColumnMapping, lastUpdated: new Date().toISOString() }
      }
      
      const { created, skipped } = response.data
      const createdLeads = created.map(convertLeadRecordToLeadData)
      
      // Get all leads to return complete state
      const allLeadsResponse = await window.api.leads.getAll()
      const allLeads = isApiSuccess(allLeadsResponse) 
        ? allLeadsResponse.data.map(convertLeadRecordToLeadData)
        : createdLeads
      
      return {
        leads: allLeads,
        columnMapping: newColumnMapping,
        lastUpdated: new Date().toISOString(),
        skippedDuplicates: skipped
      }
    } catch (error) {
      console.error('Error adding leads to database:', error)
      // Return current state on error
      const current = await this.getLeads()
      return current || { leads: [], columnMapping: newColumnMapping, lastUpdated: new Date().toISOString() }
    }
  },

  // Update a single lead's status
  async updateLeadStatus(leadId: string, status: LeadData['status']): Promise<boolean> {
    try {
      // Check if we're in Electron environment
      if (!window.api) {
        // Fallback to localStorage
        const storage = localStorage.getItem('leads_storage')
        if (!storage) return false

        const data: LeadsStorage = JSON.parse(storage)
        const leadIndex = data.leads.findIndex(l => l.id === leadId)
        if (leadIndex === -1) return false

        data.leads[leadIndex].status = status
        data.lastUpdated = new Date().toISOString()
        localStorage.setItem('leads_storage', JSON.stringify(data))
        return true
      }

      const response = await window.api.leads.update(parseInt(leadId), { status })
      
      if (isApiError(response)) {
        console.error('Error updating lead status:', response.error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error updating lead status:', error)
      return false
    }
  },

  // Update multiple leads' status
  async updateMultipleLeadsStatus(leadIds: string[], status: LeadData['status']): Promise<boolean> {
    try {
      // Check if we're in Electron environment
      if (!window.api) {
        // Fallback to localStorage
        const storage = localStorage.getItem('leads_storage')
        if (!storage) return false

        const data: LeadsStorage = JSON.parse(storage)
        leadIds.forEach(leadId => {
          const leadIndex = data.leads.findIndex(l => l.id === leadId)
          if (leadIndex !== -1) {
            data.leads[leadIndex].status = status
          }
        })
        data.lastUpdated = new Date().toISOString()
        localStorage.setItem('leads_storage', JSON.stringify(data))
        return true
      }

      const updatePromises = leadIds.map(id =>
        window.api.leads.update(parseInt(id), { status })
      )
      
      const responses = await Promise.all(updatePromises)
      const hasErrors = responses.some(response => isApiError(response))
      
      if (hasErrors) {
        console.error('Some lead status updates failed')
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error updating multiple lead statuses:', error)
      return false
    }
  },

  // Delete leads
  async deleteLeads(leadIds: string[]): Promise<boolean> {
    try {
      // Check if we're in Electron environment
      if (!window.api) {
        // Fallback to localStorage
        const storage = localStorage.getItem('leads_storage')
        if (!storage) return false

        const data: LeadsStorage = JSON.parse(storage)
        data.leads = data.leads.filter(l => !leadIds.includes(l.id))
        data.lastUpdated = new Date().toISOString()
        localStorage.setItem('leads_storage', JSON.stringify(data))
        return true
      }

      const deletePromises = leadIds.map(id =>
        window.api.leads.delete(parseInt(id))
      )
      
      const responses = await Promise.all(deletePromises)
      const hasErrors = responses.some(response => isApiError(response))
      
      if (hasErrors) {
        console.error('Some lead deletions failed')
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error deleting leads:', error)
      return false
    }
  },

  // Clear all leads
  async clearAllLeads(): Promise<boolean> {
    try {
      // Check if we're in Electron environment
      if (!window.api) {
        // Clear localStorage
        localStorage.removeItem('leads_storage')
        return true
      }

      // Get all leads first
      const response = await window.api.leads.getAll()
      
      if (isApiError(response)) {
        console.error('Error getting leads for clearing:', response.error)
        return false
      }
      
      // Delete all leads
      const deletePromises = response.data.map(lead => 
        window.api.leads.delete(lead.id)
      )
      
      const deleteResponses = await Promise.all(deletePromises)
      const hasErrors = deleteResponses.some(response => isApiError(response))
      
      if (hasErrors) {
        console.error('Some lead deletions failed during clear')
        return false
      }
      
      // Clear column mapping metadata
      await window.api.metadata.delete('columnMapping')
      
      return true
    } catch (error) {
      console.error('Error clearing leads:', error)
      return false
    }
  },

  // Get leads count by status
  async getLeadsCounts(): Promise<Record<string, number>> {
    try {
      const response = await window.api.leads.getAll()
      
      if (isApiError(response)) {
        console.error('Error getting leads for counts:', response.error)
        return {}
      }
      
      return response.data.reduce((counts, lead) => {
        counts[lead.status] = (counts[lead.status] || 0) + 1
        return counts
      }, {} as Record<string, number>)
    } catch (error) {
      console.error('Error getting leads counts:', error)
      return {}
    }
  }
}