import type { LeadData, ColumnMapping } from '@/types/lead'
import type { ApiResult, LeadRecord, BulkLeadData } from '@/types/api'
import { isApiSuccess, isApiError } from '@/types/api'

// Legacy interface for backward compatibility
export interface LeadsStorage {
  leads: LeadData[]
  columnMapping: ColumnMapping
  lastUpdated: string
  skippedDuplicates?: number
}

// Helper function to convert LeadRecord to LeadData
function convertLeadRecordToLeadData(record: LeadRecord): LeadData {
  return {
    id: record.id.toString(),
    status: record.status as LeadData['status'],
    ...record.data
  }
}

// Helper function to convert LeadData to LeadRecord format
function convertLeadDataToRecord(lead: LeadData, importId?: number): Omit<LeadRecord, 'id' | 'created_at' | 'updated_at'> {
  const { id, status, ...data } = lead
  return {
    import_id: importId || null,
    status: status || 'new',
    data
  }
}

export const leadsStorage = {
  // Get all leads from database via IPC
  async getLeads(): Promise<LeadsStorage | null> {
    try {
      const response = await window.api.leads.getAll()
      
      if (isApiError(response)) {
        console.error('Error loading leads from database:', response.error)
        return null
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
      // Save column mapping to metadata
      await window.api.metadata.set('columnMapping', newColumnMapping)
      
      // Convert leads to bulk format for database insertion
      const bulkLeads: BulkLeadData = newLeads.map(lead => convertLeadDataToRecord(lead, importId))
      
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