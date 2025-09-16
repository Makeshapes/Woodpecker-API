/**
 * Tests for ConversionButton component (Story 1.5)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ConversionButton from '../ConversionButton'
import type { PlainTextContent } from '@/utils/contentConverter'

// Mock the dependencies
vi.mock('@/utils/contentConverter', () => ({
  validatePlainText: vi.fn(),
  convertToHtmlContent: vi.fn(),
}))

vi.mock('@/services/templateService', () => ({
  TemplateService: vi.fn(() => ({
    validateGeneratedContent: vi.fn(),
  })),
}))

const mockPlainTextContent: PlainTextContent = {
  snippet1: 'Valid subject line that meets requirements',
  snippet2: 'Email body content\nWith multiple lines',
  snippet3: 'LinkedIn message under 300 chars',
  snippet4: 'Bump email content',
  snippet5: 'Follow-up content',
  snippet6: 'Second bump content',
  snippet7: 'Breakup email content',
}

const mockLeadData = {
  first_name: 'John',
  last_name: 'Doe',
  company: 'Test Corp',
  title: 'Manager',
  email: 'john@test.com',
  industry: 'Technology',
  linkedin_url: 'https://linkedin.com/in/john',
  tags: '',
  city: 'New York',
  state: 'NY',
  country: 'USA',
  timezone: 'America/New_York',
}

describe('ConversionButton', () => {
  const mockOnConversionComplete = vi.fn()
  const mockOnShowJson = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders conversion button with correct initial state', () => {
    render(
      <ConversionButton
        plainTextContent={mockPlainTextContent}
        leadData={mockLeadData}
        onConversionComplete={mockOnConversionComplete}
        onShowJson={mockOnShowJson}
      />
    )

    expect(screen.getByText('Export Content')).toBeInTheDocument()
    expect(screen.getByText('Prepare JSON')).toBeInTheDocument()
    expect(
      screen.getByText(/Convert your plain text content to HTML format/)
    ).toBeInTheDocument()
  })

  it('shows loading state during conversion', async () => {
    const { validatePlainText, convertToHtmlContent } = await import(
      '@/utils/contentConverter'
    )
    const { TemplateService } = await import('@/services/templateService')

    // Mock successful validation and conversion
    vi.mocked(validatePlainText).mockReturnValue({ isValid: true, errors: [] })
    vi.mocked(convertToHtmlContent).mockReturnValue({
      ...mockPlainTextContent,
      ...mockLeadData,
      snippet1: mockPlainTextContent.snippet1,
      snippet2: '<div>line</div>',
      snippet3: mockPlainTextContent.snippet3,
      snippet4: '<div>line</div>',
      snippet5: '<div>line</div>',
      snippet6: '<div>line</div>',
      snippet7: '<div>line</div>',
    })
    vi.mocked(TemplateService).mockImplementation(
      () =>
        ({
          validateGeneratedContent: vi.fn().mockReturnValue(true),
        }) as unknown as InstanceType<typeof TemplateService>
    )

    render(
      <ConversionButton
        plainTextContent={mockPlainTextContent}
        leadData={mockLeadData}
        onConversionComplete={mockOnConversionComplete}
        onShowJson={mockOnShowJson}
      />
    )

    const button = screen.getByText('Prepare JSON')
    fireEvent.click(button)

    // Should show loading state briefly
    await waitFor(() => {
      expect(button).toBeDisabled()
    })
  })

  it('calls validation during conversion process', async () => {
    const { validatePlainText, convertToHtmlContent } = await import(
      '@/utils/contentConverter'
    )
    const { TemplateService } = await import('@/services/templateService')

    const mockTemplateService = {
      validateGeneratedContent: vi.fn().mockReturnValue(true),
    }

    vi.mocked(validatePlainText).mockReturnValue({ isValid: true, errors: [] })
    vi.mocked(convertToHtmlContent).mockReturnValue({
      ...mockPlainTextContent,
      ...mockLeadData,
      snippet1: mockPlainTextContent.snippet1,
      snippet2: '<div>line</div>',
      snippet3: mockPlainTextContent.snippet3,
      snippet4: '<div>line</div>',
      snippet5: '<div>line</div>',
      snippet6: '<div>line</div>',
      snippet7: '<div>line</div>',
    })
    vi.mocked(TemplateService).mockImplementation(
      () =>
        mockTemplateService as unknown as InstanceType<typeof TemplateService>
    )

    render(
      <ConversionButton
        plainTextContent={mockPlainTextContent}
        leadData={mockLeadData}
        onConversionComplete={mockOnConversionComplete}
        onShowJson={mockOnShowJson}
      />
    )

    const button = screen.getByText('Prepare JSON')
    fireEvent.click(button)

    await waitFor(() => {
      expect(validatePlainText).toHaveBeenCalledWith(mockPlainTextContent)
      expect(convertToHtmlContent).toHaveBeenCalledWith(
        mockPlainTextContent,
        mockLeadData
      )
      expect(mockTemplateService.validateGeneratedContent).toHaveBeenCalled()
    })
  })

  it('shows error when plain text validation fails', async () => {
    const { validatePlainText } = await import('@/utils/contentConverter')

    vi.mocked(validatePlainText).mockReturnValue({
      isValid: false,
      errors: [{ field: 'snippet1', message: 'Subject line is too short' }],
    })

    render(
      <ConversionButton
        plainTextContent={mockPlainTextContent}
        leadData={mockLeadData}
        onConversionComplete={mockOnConversionComplete}
        onShowJson={mockOnShowJson}
      />
    )

    const button = screen.getByText('Prepare JSON')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Conversion Failed')).toBeInTheDocument()
      expect(
        screen.getByText(/Please fix the content validation errors/)
      ).toBeInTheDocument()
    })

    expect(mockOnConversionComplete).not.toHaveBeenCalled()
    expect(mockOnShowJson).not.toHaveBeenCalled()
  })

  it('shows error when HTML validation fails', async () => {
    const { validatePlainText, convertToHtmlContent } = await import(
      '@/utils/contentConverter'
    )
    const { TemplateService } = await import('@/services/templateService')

    const mockTemplateService = {
      validateGeneratedContent: vi.fn().mockReturnValue(false),
    }

    vi.mocked(validatePlainText).mockReturnValue({ isValid: true, errors: [] })
    vi.mocked(convertToHtmlContent).mockReturnValue({
      ...mockPlainTextContent,
      ...mockLeadData,
    })
    vi.mocked(TemplateService).mockImplementation(
      () =>
        mockTemplateService as unknown as InstanceType<typeof TemplateService>
    )

    render(
      <ConversionButton
        plainTextContent={mockPlainTextContent}
        leadData={mockLeadData}
        onConversionComplete={mockOnConversionComplete}
        onShowJson={mockOnShowJson}
      />
    )

    const button = screen.getByText('Prepare JSON')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Conversion Failed')).toBeInTheDocument()
      expect(
        screen.getByText(
          /Generated HTML content does not meet validation criteria/
        )
      ).toBeInTheDocument()
    })

    expect(mockOnConversionComplete).not.toHaveBeenCalled()
    expect(mockOnShowJson).not.toHaveBeenCalled()
  })

  it('shows success state and calls callbacks on successful conversion', async () => {
    const { validatePlainText, convertToHtmlContent } = await import(
      '@/utils/contentConverter'
    )
    const { TemplateService } = await import('@/services/templateService')

    const mockTemplateService = {
      validateGeneratedContent: vi.fn().mockReturnValue(true),
    }

    const convertedContent = {
      ...mockLeadData,
      ...mockPlainTextContent,
      snippet1: mockPlainTextContent.snippet1,
      snippet2: '<div>line</div>',
      snippet3: mockPlainTextContent.snippet3,
      snippet4: '<div>line</div>',
      snippet5: '<div>line</div>',
      snippet6: '<div>line</div>',
      snippet7: '<div>line</div>',
    }

    vi.mocked(validatePlainText).mockReturnValue({ isValid: true, errors: [] })
    vi.mocked(convertToHtmlContent).mockReturnValue(convertedContent)
    vi.mocked(TemplateService).mockImplementation(
      () =>
        mockTemplateService as unknown as InstanceType<typeof TemplateService>
    )

    render(
      <ConversionButton
        plainTextContent={mockPlainTextContent}
        leadData={mockLeadData}
        onConversionComplete={mockOnConversionComplete}
        onShowJson={mockOnShowJson}
      />
    )

    const button = screen.getByText('Prepare JSON')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Conversion Successful')).toBeInTheDocument()
      expect(screen.getByText('Ready for Export')).toBeInTheDocument()
      expect(screen.getByText('Edit Content')).toBeInTheDocument()
    })

    expect(mockOnConversionComplete).toHaveBeenCalledWith(convertedContent)
    expect(mockOnShowJson).toHaveBeenCalledWith(true)
  })

  it('allows reset after successful conversion', async () => {
    const { validatePlainText, convertToHtmlContent } = await import(
      '@/utils/contentConverter'
    )
    const { TemplateService } = await import('@/services/templateService')

    const mockTemplateService = {
      validateGeneratedContent: vi.fn().mockReturnValue(true),
    }

    vi.mocked(validatePlainText).mockReturnValue({ isValid: true, errors: [] })
    vi.mocked(convertToHtmlContent).mockReturnValue({
      ...mockLeadData,
      ...mockPlainTextContent,
      snippet1: mockPlainTextContent.snippet1,
      snippet2: '<div>line</div>',
      snippet3: mockPlainTextContent.snippet3,
      snippet4: '<div>line</div>',
      snippet5: '<div>line</div>',
      snippet6: '<div>line</div>',
      snippet7: '<div>line</div>',
    })
    vi.mocked(TemplateService).mockImplementation(
      () =>
        mockTemplateService as unknown as InstanceType<typeof TemplateService>
    )

    render(
      <ConversionButton
        plainTextContent={mockPlainTextContent}
        leadData={mockLeadData}
        onConversionComplete={mockOnConversionComplete}
        onShowJson={mockOnShowJson}
      />
    )

    // First conversion
    const button = screen.getByText('Prepare JSON')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Edit Content')).toBeInTheDocument()
    })

    // Reset
    const resetButton = screen.getByText('Edit Content')
    fireEvent.click(resetButton)

    expect(mockOnShowJson).toHaveBeenCalledWith(false)
    expect(screen.getByText('Prepare JSON')).toBeInTheDocument()
  })

  it('can be disabled externally', () => {
    render(
      <ConversionButton
        plainTextContent={mockPlainTextContent}
        leadData={mockLeadData}
        onConversionComplete={mockOnConversionComplete}
        onShowJson={mockOnShowJson}
        disabled={true}
      />
    )

    const button = screen.getByText('Prepare JSON')
    expect(button).toBeDisabled()
  })

  it('shows proper error messages for validation failures', async () => {
    const { validatePlainText } = await import('@/utils/contentConverter')

    vi.mocked(validatePlainText).mockReturnValue({
      isValid: false,
      errors: [
        {
          field: 'snippet1',
          message: 'Subject line is too short',
          currentLength: 20,
          minLength: 20,
        },
        {
          field: 'snippet3',
          message: 'LinkedIn message is too long',
          currentLength: 350,
          maxLength: 300,
        },
      ],
    })

    render(
      <ConversionButton
        plainTextContent={mockPlainTextContent}
        leadData={mockLeadData}
        onConversionComplete={mockOnConversionComplete}
        onShowJson={mockOnShowJson}
      />
    )

    const button = screen.getByText('Prepare JSON')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Subject line is too short')).toBeInTheDocument()
      expect(
        screen.getByText('LinkedIn message is too long')
      ).toBeInTheDocument()
    })
  })

  it('handles conversion exceptions gracefully', async () => {
    const { validatePlainText, convertToHtmlContent } = await import(
      '@/utils/contentConverter'
    )

    vi.mocked(validatePlainText).mockReturnValue({ isValid: true, errors: [] })
    vi.mocked(convertToHtmlContent).mockImplementation(() => {
      throw new Error('Conversion error')
    })

    render(
      <ConversionButton
        plainTextContent={mockPlainTextContent}
        leadData={mockLeadData}
        onConversionComplete={mockOnConversionComplete}
        onShowJson={mockOnShowJson}
      />
    )

    const button = screen.getByText('Prepare JSON')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Conversion Failed')).toBeInTheDocument()
      expect(screen.getByText('Conversion error')).toBeInTheDocument()
    })
  })
})
