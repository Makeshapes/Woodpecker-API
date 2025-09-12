import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Import } from './Import'

// Mock the child components
vi.mock('@/components/csv-upload/CsvUpload', () => ({
  CsvUpload: ({ onDataLoaded }: any) => (
    <div data-testid="csv-upload">
      <button
        onClick={() => onDataLoaded(
          {
            data: [{ Company: 'Test Corp', Email: 'test@example.com', Contact: 'John Doe' }],
            headers: ['Company', 'Email', 'Contact'],
            rowCount: 1,
            errors: []
          },
          { Company: 'company', Email: 'email', Contact: 'contact' }
        )}
      >
        Load Test Data
      </button>
    </div>
  )
}))

vi.mock('@/components/csv-upload/CsvPreview', () => ({
  CsvPreview: ({ onConfirm, onCancel }: any) => (
    <div data-testid="csv-preview">
      <button onClick={() => onConfirm({}, {})}>Confirm Import</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}))

// Mock alert for import confirmation
const mockAlert = vi.fn()
global.alert = mockAlert

describe('Import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders import page with upload component', () => {
    render(<Import />)
    
    expect(screen.getByText('Import')).toBeInTheDocument()
    expect(screen.getByText(/import your lead data from csv files/i)).toBeInTheDocument()
    expect(screen.getByTestId('csv-upload')).toBeInTheDocument()
  })

  it('transitions to preview after data is loaded', async () => {
    const user = userEvent.setup()
    render(<Import />)
    
    expect(screen.getByTestId('csv-upload')).toBeInTheDocument()
    expect(screen.queryByTestId('csv-preview')).not.toBeInTheDocument()
    
    const loadButton = screen.getByText('Load Test Data')
    await user.click(loadButton)
    
    expect(screen.queryByTestId('csv-upload')).not.toBeInTheDocument()
    expect(screen.getByTestId('csv-preview')).toBeInTheDocument()
  })

  it('handles confirm import action', async () => {
    const user = userEvent.setup()
    render(<Import />)
    
    // Load test data
    const loadButton = screen.getByText('Load Test Data')
    await user.click(loadButton)
    
    // Confirm import
    const confirmButton = screen.getByText('Confirm Import')
    await user.click(confirmButton)
    
    expect(mockAlert).toHaveBeenCalledWith('Successfully imported 1 leads!')
    
    // Should return to upload state
    await waitFor(() => {
      expect(screen.getByTestId('csv-upload')).toBeInTheDocument()
      expect(screen.queryByTestId('csv-preview')).not.toBeInTheDocument()
    })
  })

  it('handles cancel action', async () => {
    const user = userEvent.setup()
    render(<Import />)
    
    // Load test data
    const loadButton = screen.getByText('Load Test Data')
    await user.click(loadButton)
    
    expect(screen.getByTestId('csv-preview')).toBeInTheDocument()
    
    // Cancel
    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)
    
    expect(screen.getByTestId('csv-upload')).toBeInTheDocument()
    expect(screen.queryByTestId('csv-preview')).not.toBeInTheDocument()
  })

  it('maintains proper state management throughout workflow', async () => {
    const user = userEvent.setup()
    render(<Import />)
    
    // Initial state
    expect(screen.getByTestId('csv-upload')).toBeInTheDocument()
    
    // Load data
    await user.click(screen.getByText('Load Test Data'))
    expect(screen.getByTestId('csv-preview')).toBeInTheDocument()
    
    // Cancel back to upload
    await user.click(screen.getByText('Cancel'))
    expect(screen.getByTestId('csv-upload')).toBeInTheDocument()
    
    // Load data again
    await user.click(screen.getByText('Load Test Data'))
    expect(screen.getByTestId('csv-preview')).toBeInTheDocument()
    
    // Confirm and return to upload
    await user.click(screen.getByText('Confirm Import'))
    await waitFor(() => {
      expect(screen.getByTestId('csv-upload')).toBeInTheDocument()
    })
  })
})