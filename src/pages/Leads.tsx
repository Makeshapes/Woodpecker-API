import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { LeadList } from '@/components/lead-list/LeadList'
import { LeadDetail } from '@/components/lead-list/LeadDetail'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { leadsStorage } from '@/utils/leadsStorage'
import type { LeadData, CsvData, ColumnMapping } from '@/types/lead'

interface LocationState {
  csvData: CsvData
  columnMapping: ColumnMapping
}

export function Leads() {
  const location = useLocation()
  const [leads, setLeads] = useState<LeadData[]>([])
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [detailLead, setDetailLead] = useState<LeadData | null>(null)

  // Initialize leads - either from CSV import or from storage
  useEffect(() => {
    const state = location.state as LocationState
    
    if (state?.csvData && state?.columnMapping) {
      // New CSV import - add to existing leads
      const { csvData, columnMapping: mapping } = state
      
      // Transform CSV data to LeadData format
      const transformedLeads: LeadData[] = csvData.data.map((row, index) => ({
        ...row,
        id: `lead-${index}`,
        status: 'imported' as const,
        selected: false,
      }))
      
      // Add to storage and update state
      const storage = leadsStorage.addLeads(transformedLeads, mapping)
      setLeads(storage.leads)
      setColumnMapping(storage.columnMapping)
      
      // Show message if duplicates were skipped
      if (storage.skippedDuplicates && storage.skippedDuplicates > 0) {
        console.log(`Skipped ${storage.skippedDuplicates} duplicate email(s)`)
        // You could also show a toast notification here if you have a toast system
      }
      
      // Clear the navigation state to prevent re-processing on refresh
      window.history.replaceState({}, document.title)
    } else {
      // Load existing leads from storage
      const storage = leadsStorage.getLeads()
      if (storage) {
        setLeads(storage.leads)
        setColumnMapping(storage.columnMapping)
      }
      // If no leads in storage and no import data, stay on page (don't redirect)
    }
  }, [location.state])

  const handleLeadSelect = (leadIds: string[]) => {
    setSelectedLeads(leadIds)
  }

  const handleLeadDetail = (lead: LeadData) => {
    setDetailLead(lead)
  }



  const handleStatusUpdate = (leadId: string, status: LeadData['status']) => {
    // Update storage
    leadsStorage.updateLeadStatus(leadId, status)
    
    // Update local state
    setLeads(prev => prev.map(lead => 
      lead.id === leadId ? { ...lead, status } : lead
    ))
    
    // Update detail modal if it's the same lead
    if (detailLead?.id === leadId) {
      setDetailLead(prev => prev ? { ...prev, status } : null)
    }
  }


  const handleDeleteLeads = (leadIds: string[]) => {
    if (confirm(`Are you sure you want to delete ${leadIds.length} lead(s)?`)) {
      // Update storage
      leadsStorage.deleteLeads(leadIds)
      
      // Update local state
      setLeads(prev => prev.filter(lead => !leadIds.includes(lead.id)))
      
      // Clear selection
      setSelectedLeads([])
      
      // Close detail modal if showing deleted lead
      if (detailLead && leadIds.includes(detailLead.id)) {
        setDetailLead(null)
      }
    }
  }

  const handleDeleteLead = (leadId: string) => {
    if (confirm('Are you sure you want to remove this lead from the list?')) {
      // Update storage
      leadsStorage.deleteLeads([leadId])
      
      // Update local state
      setLeads(prev => prev.filter(lead => lead.id !== leadId))
      
      // Clear selection if deleted lead was selected
      setSelectedLeads(prev => prev.filter(id => id !== leadId))
      
      // Close detail modal if showing deleted lead
      if (detailLead?.id === leadId) {
        setDetailLead(null)
      }
    }
  }

  const handleClearAllLeads = () => {
    if (confirm('Are you sure you want to delete ALL leads? This cannot be undone.')) {
      leadsStorage.clearAllLeads()
      setLeads([])
      setColumnMapping({})
      setSelectedLeads([])
      setDetailLead(null)
    }
  }

  if (leads.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">No leads data found</p>
        </div>
        
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No leads data available. Please import your CSV file first.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">
            Manage and select leads for content generation
          </p>
        </div>
        
        <div className="flex gap-2">
          {selectedLeads.length > 0 && (
            <Button 
              variant="destructive"
              onClick={() => handleDeleteLeads(selectedLeads)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedLeads.length})
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={handleClearAllLeads}
            className="text-destructive hover:text-destructive"
          >
            Clear All Leads
          </Button>
        </div>
      </div>

      <LeadList
        leads={leads}
        columnMapping={columnMapping}
        onLeadSelect={handleLeadSelect}
        onLeadDetail={handleLeadDetail}
        onStatusUpdate={handleStatusUpdate}
        onDeleteLead={handleDeleteLead}
      />

      {detailLead && (
        <LeadDetail
          lead={detailLead}
          columnMapping={columnMapping}
          open={!!detailLead}
          onOpenChange={(open) => !open && setDetailLead(null)}
          onStatusUpdate={handleStatusUpdate}
          onDeleteLead={handleDeleteLead}
        />
      )}
    </div>
  )
}