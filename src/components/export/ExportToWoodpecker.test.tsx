import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportToWoodpecker } from './ExportToWoodpecker';
import WoodpeckerService from '@/services/woodpeckerService';
import type { LeadData } from '@/types/lead';
import type { WoodpeckerCampaign } from '@/services/woodpeckerService';
import {
  formatMultipleProspects,
  validateWoodpeckerProspect,
} from '@/utils/woodpeckerFormatter';

// Mock the services and utilities
vi.mock('@/services/woodpeckerService');
vi.mock('./CampaignSelector');
vi.mock('@/utils/woodpeckerFormatter');

const mockLeads: LeadData[] = [
  {
    id: 'lead-1',
    status: 'drafted',
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
  },
  {
    id: 'lead-2',
    status: 'drafted',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
  },
];

const mockCampaign: WoodpeckerCampaign = {
  campaign_id: 1,
  name: 'Test Campaign',
  status: 'ACTIVE',
  created_date: '2024-01-01',
  prospects_count: 100,
};

const mockGeneratedContent = (leadId: string) => ({
  snippet1: `Subject for ${leadId}`,
  snippet2: `Body content for ${leadId}`,
});

describe('ExportToWoodpecker', () => {
  let mockWoodpeckerService: any;
  let mockFormatMultipleProspects: any;
  let mockValidateWoodpeckerProspect: any;
  let mockCampaignSelector: any;

  beforeEach(() => {
    // Mock WoodpeckerService
    mockWoodpeckerService = {
      checkDuplicateProspects: vi.fn().mockResolvedValue([]),
      addProspectsToCampaign: vi.fn().mockResolvedValue({
        current: 2,
        total: 2,
        succeeded: 2,
        failed: 0,
        status: 'completed',
        errors: [],
      }),
    };
    (WoodpeckerService as any).mockImplementation(() => mockWoodpeckerService);

    // Mock formatter functions
    mockFormatMultipleProspects = vi.fn().mockReturnValue([
      { email: 'john@example.com', first_name: 'John' },
      { email: 'jane@example.com', first_name: 'Jane' },
    ]);

    mockValidateWoodpeckerProspect = vi.fn().mockReturnValue({
      isValid: true,
      errors: [],
    });

    // Mock CampaignSelector
    mockCampaignSelector = vi.fn(({ onValueChange }) => (
      <div data-testid="campaign-selector">
        <button
          data-testid="select-campaign"
          onClick={() => onValueChange('1', mockCampaign)}
        >
          Select Campaign
        </button>
      </div>
    ));

    // Apply mocks
    vi.mocked(formatMultipleProspects).mockImplementation(mockFormatMultipleProspects);
    vi.mocked(validateWoodpeckerProspect).mockImplementation(mockValidateWoodpeckerProspect);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render export trigger button', () => {
    render(
      <ExportToWoodpecker
        leads={mockLeads}
        getGeneratedContent={mockGeneratedContent}
      />
    );

    expect(screen.getByText('Export to Woodpecker')).toBeInTheDocument();
  });

  it('should open dialog when trigger is clicked', async () => {
    render(
      <ExportToWoodpecker
        leads={mockLeads}
        getGeneratedContent={mockGeneratedContent}
      />
    );

    fireEvent.click(screen.getByText('Export to Woodpecker'));

    await waitFor(() => {
      expect(screen.getByText('Select a Woodpecker campaign to export your prospects.')).toBeInTheDocument();
      expect(screen.getByTestId('campaign-selector')).toBeInTheDocument();
    });
  });

  it('should show confirmation dialog after campaign selection', async () => {
    render(
      <ExportToWoodpecker
        leads={mockLeads}
        getGeneratedContent={mockGeneratedContent}
      />
    );

    fireEvent.click(screen.getByText('Export to Woodpecker'));

    await waitFor(() => {
      expect(screen.getByTestId('select-campaign')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('select-campaign'));

    await waitFor(() => {
      expect(screen.getByText('Confirm Export')).toBeInTheDocument();
      expect(screen.getByText('Export Summary')).toBeInTheDocument();
      expect(screen.getByText('Campaign: Test Campaign')).toBeInTheDocument();
      expect(screen.getByText('Total Prospects: 2')).toBeInTheDocument();
    });
  });

  it('should show duplicate prospects warning', async () => {
    mockWoodpeckerService.checkDuplicateProspects.mockResolvedValue(['john@example.com']);

    render(
      <ExportToWoodpecker
        leads={mockLeads}
        getGeneratedContent={mockGeneratedContent}
      />
    );

    fireEvent.click(screen.getByText('Export to Woodpecker'));

    await waitFor(() => {
      expect(screen.getByTestId('select-campaign')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('select-campaign'));

    await waitFor(() => {
      expect(screen.getByText('Duplicate Prospects')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  it('should show validation errors', async () => {
    mockValidateWoodpeckerProspect.mockReturnValue({
      isValid: false,
      errors: ['Email format is invalid'],
    });

    render(
      <ExportToWoodpecker
        leads={mockLeads}
        getGeneratedContent={mockGeneratedContent}
      />
    );

    fireEvent.click(screen.getByText('Export to Woodpecker'));

    await waitFor(() => {
      expect(screen.getByTestId('select-campaign')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('select-campaign'));

    await waitFor(() => {
      expect(screen.getByText('Validation Errors')).toBeInTheDocument();
      expect(screen.getByText('Email format is invalid')).toBeInTheDocument();
    });
  });

  it('should export prospects successfully', async () => {
    const mockOnExportComplete = vi.fn();

    render(
      <ExportToWoodpecker
        leads={mockLeads}
        getGeneratedContent={mockGeneratedContent}
        onExportComplete={mockOnExportComplete}
      />
    );

    // Open dialog
    fireEvent.click(screen.getByText('Export to Woodpecker'));

    // Select campaign
    await waitFor(() => {
      expect(screen.getByTestId('select-campaign')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('select-campaign'));

    // Confirm export
    await waitFor(() => {
      expect(screen.getByText(/Export \(2\)/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Export \(2\)/));

    // Verify export was called
    await waitFor(() => {
      expect(mockWoodpeckerService.addProspectsToCampaign).toHaveBeenCalledWith(
        expect.any(Array),
        1,
        expect.any(Function)
      );
    });

    // Check completion
    await waitFor(() => {
      expect(screen.getByText('Export Complete')).toBeInTheDocument();
      expect(screen.getByText('Export Completed!')).toBeInTheDocument();
    });

    expect(mockOnExportComplete).toHaveBeenCalledWith(true, expect.any(Object));
  });

  it('should handle export errors', async () => {
    mockWoodpeckerService.addProspectsToCampaign.mockRejectedValue(
      new Error('Network error')
    );

    const mockOnExportComplete = vi.fn();

    render(
      <ExportToWoodpecker
        leads={mockLeads}
        getGeneratedContent={mockGeneratedContent}
        onExportComplete={mockOnExportComplete}
      />
    );

    // Open dialog and select campaign
    fireEvent.click(screen.getByText('Export to Woodpecker'));

    await waitFor(() => {
      expect(screen.getByTestId('select-campaign')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('select-campaign'));

    // Attempt export
    await waitFor(() => {
      expect(screen.getByText(/Export \(2\)/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Export \(2\)/));

    // Check error state
    await waitFor(() => {
      expect(screen.getByText('Export Error')).toBeInTheDocument();
      expect(screen.getByText('Export Failed')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    expect(mockOnExportComplete).toHaveBeenCalledWith(false);
  });

  it('should allow retry after error', async () => {
    mockWoodpeckerService.addProspectsToCampaign
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        current: 2,
        total: 2,
        succeeded: 2,
        failed: 0,
        status: 'completed',
        errors: [],
      });

    render(
      <ExportToWoodpecker
        leads={mockLeads}
        getGeneratedContent={mockGeneratedContent}
      />
    );

    // Go through initial flow and trigger error
    fireEvent.click(screen.getByText('Export to Woodpecker'));

    await waitFor(() => {
      expect(screen.getByTestId('select-campaign')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('select-campaign'));

    await waitFor(() => {
      expect(screen.getByText(/Export \(2\)/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Export \(2\)/));

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    // Click retry
    fireEvent.click(screen.getByText('Try Again'));

    // Should return to confirmation state
    await waitFor(() => {
      expect(screen.getByText('Confirm Export')).toBeInTheDocument();
    });
  });

  it('should disable export button when no valid prospects', async () => {
    mockValidateWoodpeckerProspect.mockReturnValue({
      isValid: false,
      errors: ['Email format is invalid'],
    });

    render(
      <ExportToWoodpecker
        leads={mockLeads}
        getGeneratedContent={mockGeneratedContent}
      />
    );

    fireEvent.click(screen.getByText('Export to Woodpecker'));

    await waitFor(() => {
      expect(screen.getByTestId('select-campaign')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('select-campaign'));

    await waitFor(() => {
      const exportButton = screen.getByRole('button', { name: /Export/ });
      expect(exportButton).toBeDisabled();
    });
  });

  it('should render custom trigger', () => {
    const customTrigger = <button data-testid="custom-trigger">Custom Export</button>;

    render(
      <ExportToWoodpecker
        leads={mockLeads}
        getGeneratedContent={mockGeneratedContent}
        trigger={customTrigger}
      />
    );

    expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
    expect(screen.queryByText('Export to Woodpecker')).not.toBeInTheDocument();
  });

  it('should close dialog and reset state', async () => {
    render(
      <ExportToWoodpecker
        leads={mockLeads}
        getGeneratedContent={mockGeneratedContent}
      />
    );

    // Open dialog
    fireEvent.click(screen.getByText('Export to Woodpecker'));

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    // Close dialog
    fireEvent.click(screen.getByText('Cancel'));

    // Dialog should be closed
    await waitFor(() => {
      expect(screen.queryByText('Select a Woodpecker campaign')).not.toBeInTheDocument();
    });

    // Re-open should start fresh
    fireEvent.click(screen.getByText('Export to Woodpecker'));

    await waitFor(() => {
      expect(screen.getByText('Export to Woodpecker')).toBeInTheDocument();
      expect(screen.getByTestId('campaign-selector')).toBeInTheDocument();
    });
  });
});