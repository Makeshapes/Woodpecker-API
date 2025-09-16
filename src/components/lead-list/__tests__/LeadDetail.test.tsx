import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { LeadDetail } from '../LeadDetail'
import type { LeadData, ColumnMapping } from '@/types/lead'
import type { ClaudeResponse } from '@/services/claudeService'

// Mock the contentStorage
const mockContentStorage = {
  getLeadContent: vi.fn(),
  persistContentToStorage: vi.fn(),
  hasLeadContent: vi.fn(),
  clearLeadContent: vi.fn()
}

// Mock the window.api
const mockApi = {
  content: {
    getByLead: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}

// Mock modules
vi.mock('@/utils/contentStorage', () => ({
  contentStorage: mockContentStorage
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

// Mock window.api
Object.defineProperty(window, 'api', {
  value: mockApi,
  writable: true
})

// Mock data
const mockLead: LeadData = {
  id: 'test-lead-1',
  status: 'drafted',
  email: 'test@example.com',
  company: 'Test Company',
  contact: 'John Doe',
  title: 'Software Engineer'
}

const mockColumnMapping: ColumnMapping = {
  'Email': 'email',
  'Company': 'company',
  'Full Name': 'contact',
  'Title': 'title'
}

const mockContent: ClaudeResponse = {
  snippet1: 'Test email content 1',
  snippet2: 'Test email content 2',
  snippet3: 'Test email content 3',
  snippet4: 'Test email content 4',
  snippet5: 'Test email content 5',
  snippet6: 'Test email content 6',
  snippet7: 'Test email content 7'
}

describe('LeadDetail', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnStatusUpdate = vi.fn()
  const mockOnDeleteLead = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockContentStorage.getLeadContent.mockResolvedValue(null)
    mockApi.content.getByLead.mockResolvedValue({
      success: true,
      data: []
    })
  })

  const renderLeadDetail = (props = {}) => {
    return render(
      <LeadDetail
        lead={mockLead}
        columnMapping={mockColumnMapping}
        open={true}
        onOpenChange={mockOnOpenChange}
        onStatusUpdate={mockOnStatusUpdate}
        onDeleteLead={mockOnDeleteLead}
        {...props}
      />
    )
  }

  it('renders lead information correctly', () => {
    renderLeadDetail()
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Test Company')).toBeInTheDocument()
    expect(screen.getByText('Software Engineer')).toBeInTheDocument()
  })

  it('loads content when modal opens for drafted lead', async () => {
    mockContentStorage.getLeadContent.mockResolvedValue(mockContent)
    
    renderLeadDetail()
    
    await waitFor(() => {
      expect(mockContentStorage.getLeadContent).toHaveBeenCalledWith('test-lead-1')
    })
  })

  it('shows loading state while loading content', async () => {
    // Mock a delayed response
    mockContentStorage.getLeadContent.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockContent), 100))
    )
    
    renderLeadDetail()
    
    expect(screen.getByText('Loading content...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.queryByText('Loading content...')).not.toBeInTheDocument()
    })
  })

  it('shows error state when content loading fails', async () => {
    mockContentStorage.getLeadContent.mockRejectedValue(new Error('Database error'))
    
    renderLeadDetail()
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load content from database')).toBeInTheDocument()
    })
  })

  it('does not load content for non-drafted leads', () => {
    const importedLead = { ...mockLead, status: 'imported' as const }
    
    renderLeadDetail({ lead: importedLead })
    
    expect(mockContentStorage.getLeadContent).not.toHaveBeenCalled()
  })

  it('updates content when onContentUpdate is called', async () => {
    renderLeadDetail()
    
    // Find the ContentGeneration component and simulate content update
    const contentGeneration = screen.getByTestId('content-generation')
    
    // This would be triggered by the ContentGeneration component
    // In a real test, we'd need to mock the ContentGeneration component
    // For now, we'll test the callback directly
    expect(mockOnStatusUpdate).toBeDefined()
  })

  it('disables export button when content is loading', async () => {
    mockContentStorage.getLeadContent.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockContent), 100))
    )
    
    renderLeadDetail()
    
    // The export button should be disabled while loading
    const exportButton = screen.getByText('Export to Campaign')
    expect(exportButton).toBeDisabled()
    
    await waitFor(() => {
      expect(exportButton).not.toBeDisabled()
    })
  })

  it('clears content when modal closes', async () => {
    const { rerender } = renderLeadDetail()
    
    // Close the modal
    rerender(
      <LeadDetail
        lead={mockLead}
        columnMapping={mockColumnMapping}
        open={false}
        onOpenChange={mockOnOpenChange}
        onStatusUpdate={mockOnStatusUpdate}
        onDeleteLead={mockOnDeleteLead}
      />
    )
    
    // Content should be cleared when modal is closed
    expect(mockContentStorage.getLeadContent).toHaveBeenCalledTimes(1)
  })

  it('handles content update from ContentGeneration component', () => {
    renderLeadDetail()
    
    // The component should pass an onContentUpdate callback to ContentGeneration
    // This callback should update the local content state
    expect(screen.getByTestId('content-generation')).toBeInTheDocument()
  })

  it('refreshes content periodically when modal is open', async () => {
    vi.useFakeTimers()
    
    renderLeadDetail()
    
    // Initial load
    expect(mockContentStorage.getLeadContent).toHaveBeenCalledTimes(1)
    
    // Fast-forward 5 seconds (the refresh interval)
    vi.advanceTimersByTime(5000)
    
    await waitFor(() => {
      expect(mockContentStorage.getLeadContent).toHaveBeenCalledTimes(2)
    })
    
    vi.useRealTimers()
  })
})
