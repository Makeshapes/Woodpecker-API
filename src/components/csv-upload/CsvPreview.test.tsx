import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CsvPreview } from './CsvPreview'

describe('CsvPreview', () => {
  const mockCsvData = {
    data: [
      { 'Company Name': 'Test Corp', 'Work Email': 'test@example.com', 'Full Name': 'John Doe', Title: 'CEO' },
      { 'Company Name': 'Another Corp', 'Work Email': 'jane@another.com', 'Full Name': 'Jane Smith', Title: 'CTO' },
      { 'Company Name': 'Third Corp', 'Work Email': 'bob@third.com', 'Full Name': 'Bob Johnson', Title: 'VP' }
    ],
    headers: ['Company Name', 'Work Email', 'Full Name', 'Title'],
    rowCount: 3,
    errors: []
  }

  const mockColumnMapping = {
    'Company Name': 'company',
    'Work Email': 'email',
    'Full Name': 'contact',
    'Title': 'title'
  }

  const mockOnConfirm = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders data preview correctly', () => {
    render(
      <CsvPreview
        csvData={mockCsvData}
        columnMapping={mockColumnMapping}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Data Preview')).toBeInTheDocument()
    expect(screen.getByText(/3 rows from your CSV file/)).toBeInTheDocument()
    expect(screen.getByText('Ready to Import')).toBeInTheDocument()
  })

  it('shows column mapping correctly', () => {
    render(
      <CsvPreview
        csvData={mockCsvData}
        columnMapping={mockColumnMapping}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Company Name')).toBeInTheDocument()
    expect(screen.getByText('company')).toBeInTheDocument()
    expect(screen.getByText('Work Email')).toBeInTheDocument()
    expect(screen.getByText('email')).toBeInTheDocument()
  })

  it('shows required fields status', () => {
    render(
      <CsvPreview
        csvData={mockCsvData}
        columnMapping={mockColumnMapping}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Required Fields')).toBeInTheDocument()
    
    // All required fields should show as mapped with checkmark icons
    expect(screen.getAllByTestId('check-icon').length).toBeGreaterThanOrEqual(3)
  })

  it('shows missing required fields warning', () => {
    const incompleteMappingData = {
      'Company Name': 'company',
      'Full Name': 'contact'
      // Missing email mapping
    }

    render(
      <CsvPreview
        csvData={mockCsvData}
        columnMapping={incompleteMappingData}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Missing Required Fields')).toBeInTheDocument()
    expect(screen.getByText('Fix Required Fields First')).toBeInTheDocument()
  })

  it('displays data table correctly', () => {
    render(
      <CsvPreview
        csvData={mockCsvData}
        columnMapping={mockColumnMapping}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Data Sample')).toBeInTheDocument()
    expect(screen.getByText('Rows 1-3 of 3')).toBeInTheDocument()
    
    // Check table headers
    expect(screen.getByText('Company Name')).toBeInTheDocument()
    expect(screen.getByText('Work Email')).toBeInTheDocument()
    
    // Check first row data
    expect(screen.getByText('Test Corp')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('handles pagination correctly', () => {
    const largeDataSet = {
      ...mockCsvData,
      data: Array.from({ length: 25 }, (_, i) => ({
        'Company Name': `Company ${i + 1}`,
        'Work Email': `user${i + 1}@example.com`,
        'Full Name': `User ${i + 1}`,
        'Title': 'Employee'
      })),
      rowCount: 25
    }

    render(
      <CsvPreview
        csvData={largeDataSet}
        columnMapping={mockColumnMapping}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Rows 1-10 of 25')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    
    // Check pagination buttons
    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(screen.getByText('Previous')).toBeDisabled()
  })

  it('navigates between pages', async () => {
    const user = userEvent.setup()
    const largeDataSet = {
      ...mockCsvData,
      data: Array.from({ length: 25 }, (_, i) => ({
        'Company Name': `Company ${i + 1}`,
        'Work Email': `user${i + 1}@example.com`,
        'Full Name': `User ${i + 1}`,
        'Title': 'Employee'
      })),
      rowCount: 25
    }

    render(
      <CsvPreview
        csvData={largeDataSet}
        columnMapping={mockColumnMapping}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Company 1')).toBeInTheDocument()
    
    const nextButton = screen.getByText('Next')
    await user.click(nextButton)
    
    expect(screen.getByText('Rows 11-20 of 25')).toBeInTheDocument()
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
    expect(screen.getByText('Company 11')).toBeInTheDocument()
  })

  it('displays errors when present', () => {
    const dataWithErrors = {
      ...mockCsvData,
      errors: [
        'Invalid email format in row 2',
        'Missing required field "company" in row 3',
        'Row 4 contains invalid characters'
      ]
    }

    render(
      <CsvPreview
        csvData={dataWithErrors}
        columnMapping={mockColumnMapping}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Issues to Review')).toBeInTheDocument()
    expect(screen.getByText('• Invalid email format in row 2')).toBeInTheDocument()
    expect(screen.getByText('• Missing required field "company" in row 3')).toBeInTheDocument()
    expect(screen.getByText('• Row 4 contains invalid characters')).toBeInTheDocument()
  })

  it('limits error display and shows overflow count', () => {
    const dataWithManyErrors = {
      ...mockCsvData,
      errors: Array.from({ length: 10 }, (_, i) => `Error ${i + 1}`)
    }

    render(
      <CsvPreview
        csvData={dataWithManyErrors}
        columnMapping={mockColumnMapping}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('• Error 1')).toBeInTheDocument()
    expect(screen.getByText('• Error 5')).toBeInTheDocument()
    expect(screen.getByText('...and 5 more issues')).toBeInTheDocument()
  })

  it('calls onConfirm when import button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <CsvPreview
        csvData={mockCsvData}
        columnMapping={mockColumnMapping}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const importButton = screen.getByText('Import Data')
    await user.click(importButton)

    expect(mockOnConfirm).toHaveBeenCalledWith(mockCsvData, mockColumnMapping)
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <CsvPreview
        csvData={mockCsvData}
        columnMapping={mockColumnMapping}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('disables import when required fields are missing', () => {
    const incompleteMappingData = {
      'Company Name': 'company'
      // Missing email and contact mappings
    }

    render(
      <CsvPreview
        csvData={mockCsvData}
        columnMapping={incompleteMappingData}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const importButton = screen.getByText('Fix Required Fields First')
    expect(importButton).toBeDisabled()
  })

  it('shows truncated row count when data is limited', () => {
    const truncatedData = {
      ...mockCsvData,
      rowCount: 1500 // More than actual data length
    }

    render(
      <CsvPreview
        csvData={truncatedData}
        columnMapping={mockColumnMapping}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText(/3 rows from your CSV file.*showing first 3 of 1,500/)).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    const emptyData = {
      data: [],
      headers: ['Company', 'Email', 'Contact'],
      rowCount: 0,
      errors: []
    }

    render(
      <CsvPreview
        csvData={emptyData}
        columnMapping={mockColumnMapping}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('0 rows from your CSV file')).toBeInTheDocument()
    expect(screen.getByText('Rows 1-0 of 0')).toBeInTheDocument()
  })
})