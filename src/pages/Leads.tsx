import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { LeadList } from '@/components/lead-list/LeadList'
import { LeadDetail } from '@/components/lead-list/LeadDetail'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import { leadsStorage } from '@/utils/leadsStorage'
import type { LeadData, CsvData, ColumnMapping } from '@/types/lead'
import { toast } from 'sonner'
import { useLeadOperations } from '@/hooks/useErrorHandler'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use error handling hook for better error management
  const {
    isLoading: isOperationLoading,
    executeApiOperation,
    clearError
  } = useLeadOperations()

  // Initialize leads - either from CSV import or from storage
  useEffect(() => {
    const initializeLeads = async () => {
      try {
        setLoading(true)
        setError(null)
        
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
          const storage = await leadsStorage.addLeads(transformedLeads, mapping)
          setLeads(storage.leads)
          setColumnMapping(storage.columnMapping)
          
          // Show message if duplicates were skipped
          if (storage.skippedDuplicates && storage.skippedDuplicates > 0) {
            toast.info(`Skipped ${storage.skippedDuplicates} duplicate email(s)`)
          }
          
          // Clear the navigation state to prevent re-processing on refresh
          window.history.replaceState({}, document.title)
        } else {
          // Load existing leads from storage
          const storage = await leadsStorage.getLeads()
          if (storage) {
            setLeads(storage.leads)
            setColumnMapping(storage.columnMapping)
          }
          // If no leads in storage and no import data, stay on page (don't redirect)
        }
      } catch (err) {
        console.error('Error initializing leads:', err)
        setError('Failed to load leads. Please try again.')
        toast.error('Failed to load leads')
      } finally {
        setLoading(false)
      }
    }
    
    initializeLeads()
  }, [location.state])

  const handleLeadSelect = (leadIds: string[]) => {
    setSelectedLeads(leadIds)
  }

  const handleLeadDetail = (lead: LeadData) => {
    setDetailLead(lead)
  }



  const handleStatusUpdate = async (leadId: string, status: LeadData['status']) => {
    const success = await executeApiOperation(
      () => leadsStorage.updateLeadStatus(leadId, status),
      {
        showToast: false, // We'll handle success toast manually
        retryConfig: { maxAttempts: 2 }
      }
    )

    if (success) {
      // Update local state
      setLeads(prev => prev.map(lead =>
        lead.id === leadId ? { ...lead, status } : lead
      ))

      // Update detail modal if it's the same lead
      if (detailLead?.id === leadId) {
        setDetailLead(prev => prev ? { ...prev, status } : null)
      }

      toast.success('Lead status updated')
    }
  }


  const handleDeleteLeads = async (leadIds: string[]) => {
    if (confirm(`Are you sure you want to delete ${leadIds.length} lead(s)?`)) {
      const success = await executeApiOperation(
        () => leadsStorage.deleteLeads(leadIds),
        {
          showToast: false, // We'll handle success toast manually
          retryConfig: { maxAttempts: 2 }
        }
      )

      if (success) {
        // Update local state
        setLeads(prev => prev.filter(lead => !leadIds.includes(lead.id)))

        // Clear selection
        setSelectedLeads([])

        // Close detail modal if showing deleted lead
        if (detailLead && leadIds.includes(detailLead.id)) {
          setDetailLead(null)
        }

        toast.success(`Deleted ${leadIds.length} lead(s)`)
      }
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    if (confirm('Are you sure you want to remove this lead from the list?')) {
      const success = await executeApiOperation(
        () => leadsStorage.deleteLeads([leadId]),
        {
          showToast: false, // We'll handle success toast manually
          retryConfig: { maxAttempts: 2 }
        }
      )

      if (success) {
        // Update local state
        setLeads(prev => prev.filter(lead => lead.id !== leadId))

        // Clear selection if deleted lead was selected
        setSelectedLeads(prev => prev.filter(id => id !== leadId))

        // Close detail modal if showing deleted lead
        if (detailLead?.id === leadId) {
          setDetailLead(null)
        }

        toast.success('Lead deleted')
      }
    }
  }

  const handleClearAllLeads = async () => {
    if (confirm('Are you sure you want to delete ALL leads? This cannot be undone.')) {
      const success = await executeApiOperation(
        () => leadsStorage.clearAllLeads(),
        {
          showToast: false, // We'll handle success toast manually
          retryConfig: { maxAttempts: 2 }
        }
      )

      if (success) {
        setLeads([])
        setColumnMapping({})
        setSelectedLeads([])
        setDetailLead(null)

        toast.success('All leads cleared')
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">Loading leads...</p>
        </div>
        
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            Loading your leads data...
          </p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground text-red-600">{error}</p>
        </div>
        
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            Failed to load leads. Please try refreshing the page.
          </p>
        </div>
      </div>
    )
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
              disabled={isOperationLoading}
            >
              {isOperationLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {isOperationLoading ? 'Deleting...' : `Delete Selected (${selectedLeads.length})`}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleClearAllLeads}
            disabled={isOperationLoading}
            className="text-destructive hover:text-destructive"
          >
            {isOperationLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {isOperationLoading ? 'Clearing...' : 'Clear All Leads'}
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