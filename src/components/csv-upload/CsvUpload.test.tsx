import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CsvUpload } from './CsvUpload'

// Mock Papa Parse
vi.mock('papaparse', () => ({
  default: {
    parse: vi.fn()
  }
}))

import Papa from 'papaparse'

describe('CsvUpload', () => {
  const mockOnDataLoaded = vi.fn()
  const mockPapaParse = Papa.parse as any

  beforeEach(() => {
    vi.clearAllMocks()
    mockPapaParse.mockReset()
  })

  it('renders upload area correctly', () => {
    render(<CsvUpload onDataLoaded={mockOnDataLoaded} />)
    
    expect(screen.getByText(/drag and drop your csv file here/i)).toBeInTheDocument()
    expect(screen.getByText(/select file/i)).toBeInTheDocument()
    expect(screen.getByText(/csv files up to/i)).toBeInTheDocument()
  })

  it('shows custom max rows in description', () => {
    render(<CsvUpload onDataLoaded={mockOnDataLoaded} maxRows={500} />)
    
    expect(screen.getByText(/supports up to 500 leads/i)).toBeInTheDocument()
  })

  it('handles file selection through input', async () => {
    const user = userEvent.setup()
    render(<CsvUpload onDataLoaded={mockOnDataLoaded} />)
    
    const csvContent = 'Company,Email,Contact Name\nTest Corp,test@example.com,John Doe'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    
    mockPapaParse.mockImplementation((_file: File, options: any) => {
      options.complete({
        data: [{ Company: 'Test Corp', Email: 'test@example.com', 'Contact Name': 'John Doe' }],
        meta: { fields: ['Company', 'Email', 'Contact Name'] },
        errors: []
      })
    })

    const fileInput = screen.getByRole('button', { name: /select file/i })
    await user.click(fileInput)
    
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement
    if (hiddenInput) {
      fireEvent.change(hiddenInput, { target: { files: [file] } })
    }

    await waitFor(() => {
      expect(mockPapaParse).toHaveBeenCalledWith(file, expect.any(Object))
    })
  })

  it('handles drag and drop', async () => {
    render(<CsvUpload onDataLoaded={mockOnDataLoaded} />)
    
    const csvContent = 'Company,Email,Contact Name\nTest Corp,test@example.com,John Doe'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    
    mockPapaParse.mockImplementation((_file: File, options: any) => {
      options.complete({
        data: [{ Company: 'Test Corp', Email: 'test@example.com', 'Contact Name': 'John Doe' }],
        meta: { fields: ['Company', 'Email', 'Contact Name'] },
        errors: []
      })
    })

    const dropZone = screen.getByText(/drag and drop your csv file here/i).closest('div')
    
    fireEvent.dragOver(dropZone!)
    // Note: Testing drag styling requires finding the actual styled element
    
    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [file] }
    })

    await waitFor(() => {
      expect(mockPapaParse).toHaveBeenCalledWith(file, expect.any(Object))
    })
  })

  it('detects column mapping correctly', async () => {
    render(<CsvUpload onDataLoaded={mockOnDataLoaded} />)
    
    const csvContent = 'Company Name,Work Email,Full Name\nTest Corp,test@example.com,John Doe'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    
    mockPapaParse.mockImplementation((_file: File, options: any) => {
      options.complete({
        data: [{ 'Company Name': 'Test Corp', 'Work Email': 'test@example.com', 'Full Name': 'John Doe' }],
        meta: { fields: ['Company Name', 'Work Email', 'Full Name'] },
        errors: []
      })
    })

    const dropZone = screen.getByText(/drag and drop your csv file here/i).closest('div')
    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [file] }
    })

    await waitFor(() => {
      expect(mockOnDataLoaded).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [{ 'Company Name': 'Test Corp', 'Work Email': 'test@example.com', 'Full Name': 'John Doe' }],
          headers: ['Company Name', 'Work Email', 'Full Name']
        }),
        expect.objectContaining({
          'Company Name': 'company',
          'Work Email': 'email',
          'Full Name': 'contact'
        })
      )
    })
  })

  it('validates required fields', async () => {
    render(<CsvUpload onDataLoaded={mockOnDataLoaded} />)
    
    const csvContent = 'Name,Phone\nJohn Doe,123-456-7890'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    
    mockPapaParse.mockImplementation((_file: File, options: any) => {
      options.complete({
        data: [{ Name: 'John Doe', Phone: '123-456-7890' }],
        meta: { fields: ['Name', 'Phone'] },
        errors: []
      })
    })

    const dropZone = screen.getByText(/drag and drop your csv file here/i).closest('div')
    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [file] }
    })

    await waitFor(() => {
      expect(mockOnDataLoaded).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.stringContaining('Required field "email" not found in CSV headers'),
            expect.stringContaining('Required field "company" not found in CSV headers')
          ])
        }),
        expect.any(Object)
      )
    })
  })

  it('validates email format', async () => {
    render(<CsvUpload onDataLoaded={mockOnDataLoaded} />)
    
    const csvContent = 'Company,Email,Contact Name\nTest Corp,invalid-email,John Doe'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    
    mockPapaParse.mockImplementation((_file: File, options: any) => {
      options.complete({
        data: [{ Company: 'Test Corp', Email: 'invalid-email', 'Contact Name': 'John Doe' }],
        meta: { fields: ['Company', 'Email', 'Contact Name'] },
        errors: []
      })
    })

    const dropZone = screen.getByText(/drag and drop your csv file here/i).closest('div')
    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [file] }
    })

    await waitFor(() => {
      expect(mockOnDataLoaded).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.stringContaining('Invalid email format in row 1: invalid-email')
          ])
        }),
        expect.any(Object)
      )
    })
  })

  it('enforces max rows limit', async () => {
    render(<CsvUpload onDataLoaded={mockOnDataLoaded} maxRows={2} />)
    
    const data = [
      { Company: 'Test Corp 1', Email: 'test1@example.com', 'Contact Name': 'John Doe' },
      { Company: 'Test Corp 2', Email: 'test2@example.com', 'Contact Name': 'Jane Doe' },
      { Company: 'Test Corp 3', Email: 'test3@example.com', 'Contact Name': 'Bob Smith' }
    ]
    
    const file = new File(['csv content'], 'test.csv', { type: 'text/csv' })
    
    mockPapaParse.mockImplementation((_file: File, options: any) => {
      options.complete({
        data,
        meta: { fields: ['Company', 'Email', 'Contact Name'] },
        errors: []
      })
    })

    const dropZone = screen.getByText(/drag and drop your csv file here/i).closest('div')
    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [file] }
    })

    await waitFor(() => {
      expect(mockOnDataLoaded).toHaveBeenCalledWith(
        expect.objectContaining({
          data: data.slice(0, 2),
          rowCount: 3,
          errors: expect.arrayContaining([
            expect.stringContaining('File contains 3 rows, but maximum allowed is 2')
          ])
        }),
        expect.any(Object)
      )
    })
  })

  it('rejects non-CSV files', async () => {
    render(<CsvUpload onDataLoaded={mockOnDataLoaded} />)
    
    const file = new File(['content'], 'test.txt', { type: 'text/plain' })
    
    const dropZone = screen.getByText(/drag and drop your csv file here/i).closest('div')
    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [file] }
    })

    await waitFor(() => {
      expect(screen.getByText(/please select a valid csv file/i)).toBeInTheDocument()
    })
    
    expect(mockPapaParse).not.toHaveBeenCalled()
  })

  it('shows upload progress during processing', async () => {
    render(<CsvUpload onDataLoaded={mockOnDataLoaded} />)
    
    const file = new File(['csv content'], 'test.csv', { type: 'text/csv' })
    
    // Mock Papa Parse to complete immediately but we can test the processing text appears
    mockPapaParse.mockImplementation((_file: File, options: any) => {
      // Simulate that parsing is happening
      setTimeout(() => {
        options.complete({
          data: [{ Company: 'Test Corp', Email: 'test@example.com', 'Contact Name': 'John Doe' }],
          meta: { fields: ['Company', 'Email', 'Contact Name'] },
          errors: []
        })
      }, 10)
    })

    const dropZone = screen.getByText(/drag and drop your csv file here/i).closest('div')
    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [file] }
    })

    // Should show processing state briefly
    expect(screen.getByText(/processing test.csv/i)).toBeInTheDocument()
    
    await waitFor(() => {
      expect(mockOnDataLoaded).toHaveBeenCalled()
    }, { timeout: 1000 })
  })

  it('allows resetting after upload', async () => {
    render(<CsvUpload onDataLoaded={mockOnDataLoaded} />)
    
    const file = new File(['csv content'], 'test.csv', { type: 'text/csv' })
    
    mockPapaParse.mockImplementation((_file: File, options: any) => {
      setTimeout(() => {
        options.complete({
          data: [{ Company: 'Test Corp', Email: 'test@example.com', 'Contact Name': 'John Doe' }],
          meta: { fields: ['Company', 'Email', 'Contact Name'] },
          errors: []
        })
      }, 10)
    })

    const dropZone = screen.getByText(/drag and drop your csv file here/i).closest('div')
    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [file] }
    })

    await waitFor(() => {
      expect(screen.getByText('test.csv')).toBeInTheDocument()
    }, { timeout: 1000 })

    const removeButton = screen.getByRole('button', { name: /remove/i })
    fireEvent.click(removeButton)

    expect(screen.getByText(/drag and drop your csv file here/i)).toBeInTheDocument()
    expect(screen.queryByText('test.csv')).not.toBeInTheDocument()
  })
})