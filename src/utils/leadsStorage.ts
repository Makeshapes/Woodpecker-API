import type { LeadData, ColumnMapping } from '@/types/lead'

const LEADS_STORAGE_KEY = 'woodpecker-leads'
const COLUMN_MAPPING_STORAGE_KEY = 'woodpecker-column-mapping'

export interface LeadsStorage {
  leads: LeadData[]
  columnMapping: ColumnMapping
  lastUpdated: string
  skippedDuplicates?: number
}

export const leadsStorage = {
  // Get all leads from localStorage
  getLeads(): LeadsStorage | null {
    try {
      const stored = localStorage.getItem(LEADS_STORAGE_KEY)
      if (!stored) return null
      
      const parsed = JSON.parse(stored)
      return {
        leads: parsed.leads || [],
        columnMapping: parsed.columnMapping || {},
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      }
    } catch (error) {
      console.error('Error loading leads from storage:', error)
      return null
    }
  },

  // Save leads to localStorage
  saveLeads(leads: LeadData[], columnMapping: ColumnMapping): void {
    try {
      const storage: LeadsStorage = {
        leads,
        columnMapping,
        lastUpdated: new Date().toISOString(),
      }
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(storage))
    } catch (error) {
      console.error('Error saving leads to storage:', error)
    }
  },

  // Add new leads (from import) to existing ones, skipping duplicate emails
  addLeads(newLeads: LeadData[], newColumnMapping: ColumnMapping): LeadsStorage {
    const existing = this.getLeads()
    
    if (!existing) {
      // First time - just save the new leads (no duplicates to check)
      this.saveLeads(newLeads, newColumnMapping)
      return { leads: newLeads, columnMapping: newColumnMapping, lastUpdated: new Date().toISOString() }
    }

    // Merge column mappings (new ones take precedence)
    const mergedColumnMapping = { ...existing.columnMapping, ...newColumnMapping }
    
    // Get the email field from column mapping
    const emailField = Object.keys(mergedColumnMapping).find(
      key => mergedColumnMapping[key] === 'email'
    )
    
    // Create set of existing emails for duplicate detection
    const existingEmails = new Set(
      existing.leads
        .map(lead => emailField ? String(lead[emailField] || '').toLowerCase() : '')
        .filter(email => email !== '')
    )
    
    // Filter out leads with duplicate emails
    const uniqueLeads = newLeads.filter(lead => {
      if (!emailField) return true // If no email field, can't check duplicates
      
      const email = String(lead[emailField] || '').toLowerCase()
      if (email === '') return true // Keep leads with no email
      
      return !existingEmails.has(email)
    })
    
    // Add new leads with unique IDs to avoid conflicts
    const existingIds = new Set(existing.leads.map(lead => lead.id))
    let counter = existing.leads.length - 1
    
    const leadsToAdd = uniqueLeads.map(lead => {
      let newId = lead.id
      while (existingIds.has(newId)) {
        counter++
        newId = `lead-${counter}`
      }
      existingIds.add(newId)
      return { ...lead, id: newId }
    })

    const allLeads = [...existing.leads, ...leadsToAdd]
    this.saveLeads(allLeads, mergedColumnMapping)
    
    const skippedCount = newLeads.length - uniqueLeads.length
    
    return { 
      leads: allLeads, 
      columnMapping: mergedColumnMapping, 
      lastUpdated: new Date().toISOString(),
      skippedDuplicates: skippedCount
    }
  },

  // Update a single lead's status
  updateLeadStatus(leadId: string, status: LeadData['status']): void {
    const existing = this.getLeads()
    if (!existing) return

    const updatedLeads = existing.leads.map(lead =>
      lead.id === leadId ? { ...lead, status } : lead
    )

    this.saveLeads(updatedLeads, existing.columnMapping)
  },

  // Update multiple leads' status
  updateMultipleLeadsStatus(leadIds: string[], status: LeadData['status']): void {
    const existing = this.getLeads()
    if (!existing) return

    const leadIdSet = new Set(leadIds)
    const updatedLeads = existing.leads.map(lead =>
      leadIdSet.has(lead.id) ? { ...lead, status } : lead
    )

    this.saveLeads(updatedLeads, existing.columnMapping)
  },

  // Delete leads
  deleteLeads(leadIds: string[]): void {
    const existing = this.getLeads()
    if (!existing) return

    const leadIdSet = new Set(leadIds)
    const filteredLeads = existing.leads.filter(lead => !leadIdSet.has(lead.id))

    this.saveLeads(filteredLeads, existing.columnMapping)
  },

  // Clear all leads
  clearAllLeads(): void {
    try {
      localStorage.removeItem(LEADS_STORAGE_KEY)
      localStorage.removeItem(COLUMN_MAPPING_STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing leads storage:', error)
    }
  },

  // Get leads count by status
  getLeadsCounts(): Record<string, number> {
    const existing = this.getLeads()
    if (!existing) return {}

    return existing.leads.reduce((counts, lead) => {
      counts[lead.status] = (counts[lead.status] || 0) + 1
      return counts
    }, {} as Record<string, number>)
  }
}