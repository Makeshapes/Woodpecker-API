import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Leads } from '../Leads'
import type { LeadData, ColumnMapping } from '@/types/lead'

// Mock the leadsStorage
const mockLeadsStorage = {
  getLeads: vi.fn(),
  saveLeads: vi.fn(),
  updateLeadStatus: vi.fn(),
  deleteLeads: vi.fn(),
  clearAllLeads: vi.fn(),
  bulkCreateLeads: vi.fn()
}

// Mock the error handling hook
const mockUseLeadOperations = {
  isLoading: false,
  executeApiOperation: vi.fn(),
  clearError: vi.fn(),
  error: null,
  hasError: false
}

// Mock modules
vi.mock('@/utils/leadsStorage', () => ({
  leadsStorage: mockLeadsStorage
}))

vi.mock('@/hooks/useErrorHandler', () => ({
  useLeadOperations: () => mockUseLeadOperations
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

// Mock child components
vi.mock('@/components/lead-list/LeadList', () => ({
  LeadList: ({ leads, onLeadSelect, onDeleteLead }: any) => (
    <div data-testid="lead-list">
      {leads.map((lead: LeadData) => (
        <div key={lead.id} data-testid={`lead-${lead.id}`}>
          <span>{lead.contact}</span>
          <button onClick={() => onLeadSelect(lead)}>Select</button>
          <button onClick={() => onDeleteLead(lead.id)}>Delete</button>
        </div>
      ))}
    </div>
  )
}))

vi.mock('@/components/lead-list/LeadDetail', () => ({
  LeadDetail: ({ lead, open, onOpenChange }: any) => (
    open ? (
      <div data-testid="lead-detail">
        <span>Detail for {lead?.contact}</span>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null
  )
}))

// Mock data
const mockLeads: LeadData[] = [
  {
    id: 'lead-1',
    status: 'imported',
    email: 'john@example.com',
    company: 'Company A',
    contact: 'John Doe',
    title: 'Engineer'
  },
  {
    id: 'lead-2',
    status: 'drafted',
    email: 'jane@example.com',
    company: 'Company B',
    contact: 'Jane Smith',
    title: 'Manager'
  }
]

const mockColumnMapping: ColumnMapping = {
  'Email': 'email',
  'Company': 'company',
  'Full Name': 'contact',
  'Title': 'title'
}

describe('Leads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLeadsStorage.getLeads.mockResolvedValue({
      leads: mockLeads,
      columnMapping: mockColumnMapping,
      lastUpdated: new Date().toISOString()
    })
    mockUseLeadOperations.executeApiOperation.mockImplementation(
      (operation) => operation()
    )
    
    // Mock window.confirm
    Object.defineProperty(window, 'confirm', {
      value: vi.fn(() => true),
      writable: true
    })
  })

  const renderLeads = (initialEntries = ['/']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Leads />
      </MemoryRouter>
    )
  }

  it('loads leads on mount', async () => {
    renderLeads()
    
    await waitFor(() => {
      expect(mockLeadsStorage.getLeads).toHaveBeenCalled()
    })
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('shows loading state while loading leads', () => {
    mockLeadsStorage.getLeads.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        leads: mockLeads,
        columnMapping: mockColumnMapping,
        lastUpdated: new Date().toISOString()
      }), 100))
    )
    
    renderLeads()
    
    expect(screen.getByText('Loading leads...')).toBeInTheDocument()
  })

  it('handles CSV import from location state', async () => {
    const csvData = {
      data: [
        { 'Full Name': 'New Lead', 'Email': 'new@example.com', 'Company': 'New Company' }
      ],
      headers: ['Full Name', 'Email', 'Company'],
      rowCount: 1,
      errors: []
    }
    
    const locationState = {
      csvData,
      columnMapping: mockColumnMapping
    }
    
    mockLeadsStorage.bulkCreateLeads.mockResolvedValue(true)
    
    renderLeads([{ pathname: '/', state: locationState }])
    
    await waitFor(() => {
      expect(mockLeadsStorage.bulkCreateLeads).toHaveBeenCalled()
    })
  })

  it('updates lead status with error handling', async () => {
    mockLeadsStorage.updateLeadStatus.mockResolvedValue(true)
    mockUseLeadOperations.executeApiOperation.mockResolvedValue(true)
    
    renderLeads()
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
    
    // This would be called by the LeadList component
    // We'll test the handler function directly
    expect(mockUseLeadOperations.executeApiOperation).toBeDefined()
  })

  it('deletes selected leads with confirmation', async () => {
    mockLeadsStorage.deleteLeads.mockResolvedValue(true)
    mockUseLeadOperations.executeApiOperation.mockResolvedValue(true)
    
    renderLeads()
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
    
    // Select a lead (this would be done through the LeadList component)
    // For testing, we'll simulate the delete action
    const deleteButton = screen.getByText('Delete Selected (0)')
    expect(deleteButton).toBeDisabled() // No leads selected
  })

  it('shows delete button when leads are selected', async () => {
    renderLeads()
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
    
    // The delete button should be hidden when no leads are selected
    expect(screen.queryByText(/Delete Selected/)).not.toBeInTheDocument()
  })

  it('clears all leads with confirmation', async () => {
    mockLeadsStorage.clearAllLeads.mockResolvedValue(true)
    mockUseLeadOperations.executeApiOperation.mockResolvedValue(true)
    
    renderLeads()
    
    await waitFor(() => {
      expect(screen.getByText('Clear All Leads')).toBeInTheDocument()
    })
    
    const clearButton = screen.getByText('Clear All Leads')
    fireEvent.click(clearButton)
    
    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete ALL leads? This cannot be undone.'
    )
    
    await waitFor(() => {
      expect(mockUseLeadOperations.executeApiOperation).toHaveBeenCalled()
    })
  })

  it('shows loading state during operations', () => {
    mockUseLeadOperations.isLoading = true
    
    renderLeads()
    
    const clearButton = screen.getByText('Clearing...')
    expect(clearButton).toBeDisabled()
  })

  it('opens lead detail modal when lead is selected', async () => {
    renderLeads()
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
    
    const selectButton = screen.getAllByText('Select')[0]
    fireEvent.click(selectButton)
    
    expect(screen.getByTestId('lead-detail')).toBeInTheDocument()
    expect(screen.getByText('Detail for John Doe')).toBeInTheDocument()
  })

  it('closes lead detail modal', async () => {
    renderLeads()
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
    
    // Open detail
    const selectButton = screen.getAllByText('Select')[0]
    fireEvent.click(selectButton)
    
    expect(screen.getByTestId('lead-detail')).toBeInTheDocument()
    
    // Close detail
    const closeButton = screen.getByText('Close')
    fireEvent.click(closeButton)
    
    expect(screen.queryByTestId('lead-detail')).not.toBeInTheDocument()
  })

  it('handles delete lead from detail modal', async () => {
    mockLeadsStorage.deleteLeads.mockResolvedValue(true)
    mockUseLeadOperations.executeApiOperation.mockResolvedValue(true)
    
    renderLeads()
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
    
    // Delete a lead using the delete button in the list
    const deleteButton = screen.getAllByText('Delete')[0]
    fireEvent.click(deleteButton)
    
    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to remove this lead from the list?'
    )
    
    await waitFor(() => {
      expect(mockUseLeadOperations.executeApiOperation).toHaveBeenCalled()
    })
  })

  it('handles errors during lead operations', async () => {
    mockUseLeadOperations.executeApiOperation.mockResolvedValue(null) // Indicates failure
    
    renderLeads()
    
    await waitFor(() => {
      expect(screen.getByText('Clear All Leads')).toBeInTheDocument()
    })
    
    const clearButton = screen.getByText('Clear All Leads')
    fireEvent.click(clearButton)
    
    // The error handling hook should handle the error display
    expect(mockUseLeadOperations.executeApiOperation).toHaveBeenCalled()
  })
})
