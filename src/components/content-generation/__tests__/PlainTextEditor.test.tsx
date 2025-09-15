/**
 * Tests for PlainTextEditor component (Story 1.5)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import PlainTextEditor from '../PlainTextEditor'
import { PlainTextContent } from '@/utils/contentConverter'

// Mock the validation module
vi.mock('@/utils/contentConverter', async () => {
  const actual = await vi.importActual('@/utils/contentConverter')
  return {
    ...actual,
    validatePlainText: vi.fn(() => ({
      isValid: true,
      errors: []
    }))
  }
})

const mockContent: PlainTextContent = {
  snippet1: 'Test subject line that is long enough to pass',
  snippet2: 'Test email body\nWith multiple lines',
  snippet3: 'Test LinkedIn message',
  snippet4: 'Test bump email',
  snippet5: 'Test follow-up',
  snippet6: 'Test second bump',
  snippet7: 'Test breakup email'
}

describe('PlainTextEditor', () => {
  const mockOnChange = vi.fn()
  const mockOnEditField = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all content fields', () => {
    render(
      <PlainTextEditor
        content={mockContent}
        onChange={mockOnChange}
        editingField={null}
        onEditField={mockOnEditField}
      />
    )

    expect(screen.getByText('Email Subject')).toBeInTheDocument()
    expect(screen.getByText('Email Body')).toBeInTheDocument()
    expect(screen.getByText('LinkedIn Message')).toBeInTheDocument()
    expect(screen.getByText('Bump Email')).toBeInTheDocument()
    expect(screen.getByText('Follow-up Email')).toBeInTheDocument()
    expect(screen.getByText('Bump Email 2')).toBeInTheDocument()
    expect(screen.getByText('Breakup Email')).toBeInTheDocument()
  })

  it('displays content in preview mode by default', () => {
    render(
      <PlainTextEditor
        content={mockContent}
        onChange={mockOnChange}
        editingField={null}
        onEditField={mockOnEditField}
      />
    )

    expect(screen.getByText(mockContent.snippet1)).toBeInTheDocument()
    expect(screen.getByText(mockContent.snippet2)).toBeInTheDocument()
  })

  it('shows edit buttons for each field', () => {
    render(
      <PlainTextEditor
        content={mockContent}
        onChange={mockOnChange}
        editingField={null}
        onEditField={mockOnEditField}
      />
    )

    const editButtons = screen.getAllByRole('button')
    const editIconButtons = editButtons.filter(button => {
      const svg = button.querySelector('svg')
      return svg && svg.classList.contains('lucide-edit')
    })

    expect(editIconButtons).toHaveLength(7) // One for each snippet
  })

  it('switches to edit mode when edit button is clicked', () => {
    render(
      <PlainTextEditor
        content={mockContent}
        onChange={mockOnChange}
        editingField={null}
        onEditField={mockOnEditField}
      />
    )

    const firstEditButton = screen.getAllByRole('button').find(button => {
      const svg = button.querySelector('svg')
      return svg && svg.classList.contains('lucide-edit')
    })

    fireEvent.click(firstEditButton!)

    expect(mockOnEditField).toHaveBeenCalledWith('snippet1')
  })

  it('shows input field when editing snippet1 (subject line)', () => {
    render(
      <PlainTextEditor
        content={mockContent}
        onChange={mockOnChange}
        editingField="snippet1"
        onEditField={mockOnEditField}
      />
    )

    const input = screen.getByPlaceholderText('Enter subject line (36-50 characters)...')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue(mockContent.snippet1)
  })

  it('shows textarea when editing email content fields', () => {
    render(
      <PlainTextEditor
        content={mockContent}
        onChange={mockOnChange}
        editingField="snippet2"
        onEditField={mockOnEditField}
      />
    )

    const textarea = screen.getByPlaceholderText('Enter email body...\n\nUse line breaks for paragraphs.')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveValue(mockContent.snippet2)
  })

  it('calls onChange when content is modified', async () => {
    render(
      <PlainTextEditor
        content={mockContent}
        onChange={mockOnChange}
        editingField="snippet1"
        onEditField={mockOnEditField}
      />
    )

    const input = screen.getByPlaceholderText('Enter subject line (36-50 characters)...')
    const newValue = 'Updated subject line that meets the length requirements'

    fireEvent.change(input, { target: { value: newValue } })

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith({
        ...mockContent,
        snippet1: newValue
      })
    })
  })

  it('shows save and cancel buttons when editing', () => {
    render(
      <PlainTextEditor
        content={mockContent}
        onChange={mockOnChange}
        editingField="snippet1"
        onEditField={mockOnEditField}
      />
    )

    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('calls onEditField with null when cancel is clicked', () => {
    render(
      <PlainTextEditor
        content={mockContent}
        onChange={mockOnChange}
        editingField="snippet1"
        onEditField={mockOnEditField}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(mockOnEditField).toHaveBeenCalledWith(null)
  })

  it('displays character count for subject line', () => {
    render(
      <PlainTextEditor
        content={mockContent}
        onChange={mockOnChange}
        editingField={null}
        onEditField={mockOnEditField}
      />
    )

    // Find the subject line card and check for character count badge
    const subjectCard = screen.getByText('Email Subject').closest('.relative')
    expect(subjectCard).toBeInTheDocument()
  })

  it('displays character count for LinkedIn message', () => {
    render(
      <PlainTextEditor
        content={mockContent}
        onChange={mockOnChange}
        editingField={null}
        onEditField={mockOnEditField}
      />
    )

    // Find the LinkedIn card and check for character count badge
    const linkedinCard = screen.getByText('LinkedIn Message').closest('.relative')
    expect(linkedinCard).toBeInTheDocument()
  })

  it('shows timeline badges for all fields', () => {
    render(
      <PlainTextEditor
        content={mockContent}
        onChange={mockOnChange}
        editingField={null}
        onEditField={mockOnEditField}
      />
    )

    expect(screen.getByText('Day 1')).toBeInTheDocument()
    expect(screen.getByText('Day 2-3')).toBeInTheDocument()
    expect(screen.getByText('Day 7')).toBeInTheDocument()
    expect(screen.getByText('Day 12')).toBeInTheDocument()
    expect(screen.getByText('Day 17')).toBeInTheDocument()
    expect(screen.getByText('Day 25')).toBeInTheDocument()
  })

  it('allows clicking on preview area to edit', () => {
    render(
      <PlainTextEditor
        content={mockContent}
        onChange={mockOnChange}
        editingField={null}
        onEditField={mockOnEditField}
      />
    )

    // Find and click on the first preview area
    const previewArea = screen.getByText(mockContent.snippet1).closest('.cursor-pointer')
    fireEvent.click(previewArea!)

    expect(mockOnEditField).toHaveBeenCalledWith('snippet1')
  })

  it('shows placeholder text for empty fields', () => {
    const emptyContent: PlainTextContent = {
      snippet1: '',
      snippet2: '',
      snippet3: '',
      snippet4: '',
      snippet5: '',
      snippet6: '',
      snippet7: ''
    }

    render(
      <PlainTextEditor
        content={emptyContent}
        onChange={mockOnChange}
        editingField={null}
        onEditField={mockOnEditField}
      />
    )

    expect(screen.getByText('Click to add email subject...')).toBeInTheDocument()
    expect(screen.getByText('Click to add email body...')).toBeInTheDocument()
    expect(screen.getByText('Click to add linkedin message...')).toBeInTheDocument()
  })
})