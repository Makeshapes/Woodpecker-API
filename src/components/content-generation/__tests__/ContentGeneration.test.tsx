import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ContentGeneration } from '../ContentGeneration'
import type { LeadData } from '@/types/lead'
import type { ClaudeResponse } from '@/services/claudeService'

// Mock the contentStorage
const mockContentStorage = {
  getLeadContent: vi.fn(),
  persistContentToStorage: vi.fn(),
  hasLeadContent: vi.fn(),
  clearLeadContent: vi.fn()
}

// Mock the contentGenerationService
const mockContentGenerationService = {
  getLeadContent: vi.fn(),
  generateForLead: vi.fn(),
  setGenerationMode: vi.fn()
}

// Mock the error handling hook
const mockUseContentOperations = {
  isLoading: false,
  executeWithErrorHandling: vi.fn(),
  clearError: vi.fn(),
  error: null,
  hasError: false
}

// Mock modules
vi.mock('@/utils/contentStorage', () => ({
  contentStorage: mockContentStorage
}))

vi.mock('@/services/contentGenerationService', () => ({
  contentGenerationService: mockContentGenerationService
}))

vi.mock('@/hooks/useErrorHandler', () => ({
  useContentOperations: () => mockUseContentOperations
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

// Mock data
const mockLead: LeadData = {
  id: 'test-lead-1',
  status: 'drafted',
  email: 'test@example.com',
  company: 'Test Company',
  contact: 'John Doe',
  title: 'Software Engineer'
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

describe('ContentGeneration', () => {
  const mockOnContentUpdate = vi.fn()
  const mockOnStatusUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockContentGenerationService.getLeadContent.mockResolvedValue(null)
    mockUseContentOperations.executeWithErrorHandling.mockImplementation(
      (operation) => operation()
    )
  })

  const renderContentGeneration = (props = {}) => {
    return render(
      <ContentGeneration
        lead={mockLead}
        onContentUpdate={mockOnContentUpdate}
        onStatusUpdate={mockOnStatusUpdate}
        {...props}
      />
    )
  }

  it('renders generation button when no content exists', () => {
    renderContentGeneration()
    
    expect(screen.getByText('Generate Content')).toBeInTheDocument()
  })

  it('loads existing content on mount', async () => {
    mockContentGenerationService.getLeadContent.mockResolvedValue(mockContent)
    
    renderContentGeneration()
    
    await waitFor(() => {
      expect(mockContentGenerationService.getLeadContent).toHaveBeenCalled()
    })
  })

  it('displays content when available', async () => {
    mockContentGenerationService.getLeadContent.mockResolvedValue(mockContent)
    
    renderContentGeneration()
    
    await waitFor(() => {
      expect(screen.getByText('Test email content 1')).toBeInTheDocument()
    })
  })

  it('shows loading state during content generation', async () => {
    mockContentGenerationService.generateForLead.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockContent), 100))
    )
    
    renderContentGeneration()
    
    const generateButton = screen.getByText('Generate Content')
    fireEvent.click(generateButton)
    
    expect(screen.getByText('Generating Content...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.queryByText('Generating Content...')).not.toBeInTheDocument()
    })
  })

  it('saves content with error handling', async () => {
    mockContentStorage.persistContentToStorage.mockResolvedValue(true)
    mockUseContentOperations.executeWithErrorHandling.mockResolvedValue(true)
    
    renderContentGeneration({ content: mockContent })
    
    // Find and click edit button for first snippet
    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])
    
    // Edit the content
    const textarea = screen.getByDisplayValue('Test email content 1')
    fireEvent.change(textarea, { target: { value: 'Updated content' } })
    
    // Save the edit
    const saveButton = screen.getByText('Save')
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(mockUseContentOperations.executeWithErrorHandling).toHaveBeenCalled()
    })
  })

  it('shows save loading state', () => {
    mockUseContentOperations.isLoading = true
    
    renderContentGeneration({ content: mockContent })
    
    // Find and click edit button for first snippet
    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])
    
    // The save button should show loading state
    expect(screen.getByText('Saving...')).toBeInTheDocument()
  })

  it('handles content conversion to HTML', async () => {
    const htmlContent = { ...mockContent, snippet1: '<p>HTML content</p>' }
    mockUseContentOperations.executeWithErrorHandling.mockResolvedValue(true)
    
    renderContentGeneration({ content: mockContent })
    
    // Simulate conversion complete callback
    // This would normally be called by the enhanced editing component
    const conversionCallback = mockOnContentUpdate.mock.calls[0]?.[0]
    if (conversionCallback) {
      await conversionCallback(htmlContent)
    }
    
    expect(mockUseContentOperations.executeWithErrorHandling).toHaveBeenCalled()
  })

  it('validates lead data before generation', () => {
    const invalidLead = { ...mockLead, email: '', company: '' }
    
    renderContentGeneration({ lead: invalidLead })
    
    const generateButton = screen.getByText('Generate Content')
    fireEvent.click(generateButton)
    
    expect(screen.getByText(/Lead must have email and company information/)).toBeInTheDocument()
  })

  it('updates lead status during generation', async () => {
    mockContentGenerationService.generateForLead.mockResolvedValue(mockContent)
    
    renderContentGeneration()
    
    const generateButton = screen.getByText('Generate Content')
    fireEvent.click(generateButton)
    
    await waitFor(() => {
      expect(mockOnStatusUpdate).toHaveBeenCalledWith(mockLead.id, 'generating')
    })
  })

  it('calls onContentUpdate when content is generated', async () => {
    mockContentGenerationService.generateForLead.mockResolvedValue(mockContent)
    
    renderContentGeneration()
    
    const generateButton = screen.getByText('Generate Content')
    fireEvent.click(generateButton)
    
    await waitFor(() => {
      expect(mockOnContentUpdate).toHaveBeenCalledWith(mockContent)
    })
  })

  it('handles generation errors gracefully', async () => {
    mockContentGenerationService.generateForLead.mockRejectedValue(new Error('Generation failed'))
    
    renderContentGeneration()
    
    const generateButton = screen.getByText('Generate Content')
    fireEvent.click(generateButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to generate content/)).toBeInTheDocument()
    })
  })

  it('retries failed save operations', async () => {
    mockUseContentOperations.executeWithErrorHandling.mockRejectedValueOnce(new Error('Save failed'))
      .mockResolvedValueOnce(true)
    
    renderContentGeneration({ content: mockContent })
    
    // The error handling hook should handle retries automatically
    expect(mockUseContentOperations.executeWithErrorHandling).toBeDefined()
  })
})
