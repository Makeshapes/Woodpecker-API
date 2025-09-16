import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Leads } from '@/pages/Leads'
import type { LeadData, ColumnMapping } from '@/types/lead'
import type { ClaudeResponse } from '@/services/claudeService'

// Mock all the storage utilities
const mockLeadsStorage = {
  getLeads: vi.fn(),
  saveLeads: vi.fn(),
  updateLeadStatus: vi.fn(),
  deleteLeads: vi.fn(),
  clearAllLeads: vi.fn(),
  bulkCreateLeads: vi.fn()
}

const mockContentStorage = {
  getLeadContent: vi.fn(),
  persistContentToStorage: vi.fn(),
  hasLeadContent: vi.fn(),
  clearLeadContent: vi.fn()
}

const mockContentGenerationService = {
  getLeadContent: vi.fn(),
  generateForLead: vi.fn(),
  setGenerationMode: vi.fn()
}

// Mock the window.api
const mockApi = {
  leads: {
    getAll: vi.fn(),
    create: vi.fn(),
    bulkCreate: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  content: {
    getByLead: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  metadata: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn()
  }
}

// Mock modules
vi.mock('@/utils/leadsStorage', () => ({
  leadsStorage: mockLeadsStorage
}))

vi.mock('@/utils/contentStorage', () => ({
  contentStorage: mockContentStorage
}))

vi.mock('@/services/contentGenerationService', () => ({
  contentGenerationService: mockContentGenerationService
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

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: vi.fn(() => true),
  writable: true
})

// Test data
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

const mockGeneratedContent: ClaudeResponse = {
  snippet1: 'Hi John, I hope this email finds you well.',
  snippet2: 'I wanted to reach out regarding Company A...',
  snippet3: 'As an Engineer, you might be interested in...',
  snippet4: 'Our solution can help with...',
  snippet5: 'Would you be available for a quick call?',
  snippet6: 'Best regards,',
  snippet7: 'Sales Team'
}

describe('Lead Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock responses
    mockLeadsStorage.getLeads.mockResolvedValue({
      leads: mockLeads,
      columnMapping: mockColumnMapping,
      lastUpdated: new Date().toISOString()
    })
    
    mockContentStorage.getLeadContent.mockResolvedValue(null)
    mockContentGenerationService.getLeadContent.mockResolvedValue(null)
    
    // Mock successful API responses
    mockApi.leads.getAll.mockResolvedValue({
      success: true,
      data: mockLeads.map(lead => ({ ...lead, created_at: new Date(), updated_at: new Date() }))
    })
    
    mockApi.content.getByLead.mockResolvedValue({
      success: true,
      data: []
    })
    
    mockApi.metadata.get.mockResolvedValue({
      success: true,
      data: { value: mockColumnMapping }
    })
  })

  const renderLeadsPage = () => {
    return render(
      <MemoryRouter>
        <Leads />
      </MemoryRouter>
    )
  }

  it('completes full lead workflow: import -> generate -> edit -> save', async () => {
    // 1. Load leads page
    renderLeadsPage()
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
    
    // 2. Select a lead to open detail modal
    const leadRows = screen.getAllByTestId(/lead-/)
    fireEvent.click(leadRows[0])
    
    await waitFor(() => {
      expect(screen.getByTestId('lead-detail')).toBeInTheDocument()
    })
    
    // 3. Generate content for the lead
    mockContentGenerationService.generateForLead.mockResolvedValue(mockGeneratedContent)
    mockContentStorage.persistContentToStorage.mockResolvedValue(true)
    
    const generateButton = screen.getByText('Generate Content')
    fireEvent.click(generateButton)
    
    // Should show generating state
    await waitFor(() => {
      expect(screen.getByText('Generating Content...')).toBeInTheDocument()
    })
    
    // Should complete generation and show content
    await waitFor(() => {
      expect(screen.getByText('Hi John, I hope this email finds you well.')).toBeInTheDocument()
    })
    
    // 4. Edit content
    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])
    
    const textarea = screen.getByDisplayValue('Hi John, I hope this email finds you well.')
    fireEvent.change(textarea, { 
      target: { value: 'Hi John, I hope you are doing well.' } 
    })
    
    // 5. Save edited content
    const saveButton = screen.getByText('Save')
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(mockContentStorage.persistContentToStorage).toHaveBeenCalledWith(
        'lead-1',
        expect.objectContaining({
          snippet1: 'Hi John, I hope you are doing well.'
        })
      )
    })
    
    // Should show success message
    expect(screen.getByText('Saved to database')).toBeInTheDocument()
  })

  it('handles errors gracefully throughout workflow', async () => {
    // 1. Load leads page with error
    mockLeadsStorage.getLeads.mockRejectedValue(new Error('Database connection failed'))
    
    renderLeadsPage()
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load leads')).toBeInTheDocument()
    })
    
    // 2. Retry loading leads
    mockLeadsStorage.getLeads.mockResolvedValue({
      leads: mockLeads,
      columnMapping: mockColumnMapping,
      lastUpdated: new Date().toISOString()
    })
    
    const retryButton = screen.getByText('Retry')
    fireEvent.click(retryButton)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
    
    // 3. Try to generate content with error
    const leadRows = screen.getAllByTestId(/lead-/)
    fireEvent.click(leadRows[0])
    
    await waitFor(() => {
      expect(screen.getByTestId('lead-detail')).toBeInTheDocument()
    })
    
    mockContentGenerationService.generateForLead.mockRejectedValue(
      new Error('Content generation service unavailable')
    )
    
    const generateButton = screen.getByText('Generate Content')
    fireEvent.click(generateButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to generate content/)).toBeInTheDocument()
    })
    
    // 4. Try to save content with error
    mockContentGenerationService.generateForLead.mockResolvedValue(mockGeneratedContent)
    mockContentStorage.persistContentToStorage.mockRejectedValue(
      new Error('Database write failed')
    )
    
    fireEvent.click(generateButton)
    
    await waitFor(() => {
      expect(screen.getByText('Hi John, I hope this email finds you well.')).toBeInTheDocument()
    })
    
    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])
    
    const textarea = screen.getByDisplayValue('Hi John, I hope this email finds you well.')
    fireEvent.change(textarea, { 
      target: { value: 'Updated content' } 
    })
    
    const saveButton = screen.getByText('Save')
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to save to database')).toBeInTheDocument()
    })
  })

  it('handles concurrent operations correctly', async () => {
    renderLeadsPage()
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
    
    // 1. Start multiple delete operations
    mockLeadsStorage.deleteLeads.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(true), 100))
    )
    
    const deleteButtons = screen.getAllByText('Delete')
    
    // Click multiple delete buttons quickly
    fireEvent.click(deleteButtons[0])
    fireEvent.click(deleteButtons[1])
    
    // Should show loading state
    expect(screen.getByText('Deleting...')).toBeInTheDocument()
    
    // Should complete both operations
    await waitFor(() => {
      expect(mockLeadsStorage.deleteLeads).toHaveBeenCalledTimes(2)
    })
  })

  it('maintains data consistency across operations', async () => {
    renderLeadsPage()
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
    
    // 1. Update lead status
    mockLeadsStorage.updateLeadStatus.mockResolvedValue(true)
    
    // This would be triggered by the LeadList component
    // Simulating status update
    const leadElement = screen.getByTestId('lead-lead-1')
    expect(leadElement).toBeInTheDocument()
    
    // 2. Generate content for lead
    const leadRows = screen.getAllByTestId(/lead-/)
    fireEvent.click(leadRows[0])
    
    await waitFor(() => {
      expect(screen.getByTestId('lead-detail')).toBeInTheDocument()
    })
    
    mockContentGenerationService.generateForLead.mockResolvedValue(mockGeneratedContent)
    mockContentStorage.persistContentToStorage.mockResolvedValue(true)
    
    const generateButton = screen.getByText('Generate Content')
    fireEvent.click(generateButton)
    
    await waitFor(() => {
      expect(screen.getByText('Hi John, I hope this email finds you well.')).toBeInTheDocument()
    })
    
    // 3. Verify content is linked to correct lead
    expect(mockContentStorage.persistContentToStorage).toHaveBeenCalledWith(
      'lead-1',
      expect.any(Object)
    )
    
    // 4. Delete lead should also clean up content
    mockLeadsStorage.deleteLeads.mockResolvedValue(true)
    
    const deleteButton = screen.getByText('Delete')
    fireEvent.click(deleteButton)
    
    await waitFor(() => {
      expect(mockLeadsStorage.deleteLeads).toHaveBeenCalledWith(['lead-1'])
    })
  })
})
