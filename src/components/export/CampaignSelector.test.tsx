import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CampaignSelector } from './CampaignSelector';
import WoodpeckerService from '@/services/woodpeckerService';
import type { WoodpeckerCampaign } from '@/services/woodpeckerService';

// Mock the WoodpeckerService
vi.mock('@/services/woodpeckerService');

const mockCampaigns: WoodpeckerCampaign[] = [
  {
    campaign_id: 1,
    name: 'Q1 Outreach Campaign',
    status: 'ACTIVE',
    created_date: '2024-01-01',
    prospects_count: 150,
  },
  {
    campaign_id: 2,
    name: 'Product Launch Campaign',
    status: 'PAUSED',
    created_date: '2024-01-15',
    prospects_count: 75,
  },
  {
    campaign_id: 3,
    name: 'Follow-up Campaign',
    status: 'COMPLETED',
    created_date: '2024-02-01',
    prospects_count: 1,
  },
];

describe('CampaignSelector', () => {
  const mockOnValueChange = vi.fn();
  let mockWoodpeckerService: any;

  beforeEach(() => {
    mockOnValueChange.mockClear();

    mockWoodpeckerService = {
      getCampaigns: vi.fn(),
    };

    (WoodpeckerService as any).mockImplementation(() => mockWoodpeckerService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', async () => {
    mockWoodpeckerService.getCampaigns.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockCampaigns), 100))
    );

    render(<CampaignSelector onValueChange={mockOnValueChange} />);

    expect(screen.getByText('Loading campaigns...')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should load and display campaigns', async () => {
    mockWoodpeckerService.getCampaigns.mockResolvedValue(mockCampaigns);

    render(<CampaignSelector onValueChange={mockOnValueChange} />);

    await waitFor(() => {
      expect(screen.getByText('Select a campaign')).toBeInTheDocument();
    });

    // Click to open dropdown
    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('Q1 Outreach Campaign')).toBeInTheDocument();
      expect(screen.getByText('Product Launch Campaign')).toBeInTheDocument();
      expect(screen.getByText('Follow-up Campaign')).toBeInTheDocument();
    });
  });

  it('should display campaign details correctly', async () => {
    mockWoodpeckerService.getCampaigns.mockResolvedValue(mockCampaigns);

    render(<CampaignSelector onValueChange={mockOnValueChange} />);

    await waitFor(() => {
      expect(screen.getByText('Select a campaign')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      // Check campaign names
      expect(screen.getByText('Q1 Outreach Campaign')).toBeInTheDocument();

      // Check status badges
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
      expect(screen.getByText('PAUSED')).toBeInTheDocument();
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();

      // Check prospect counts
      expect(screen.getByText('150 prospects')).toBeInTheDocument();
      expect(screen.getByText('75 prospects')).toBeInTheDocument();
      expect(screen.getByText('1 prospect')).toBeInTheDocument();

      // Check IDs
      expect(screen.getByText('ID: 1')).toBeInTheDocument();
      expect(screen.getByText('ID: 2')).toBeInTheDocument();
      expect(screen.getByText('ID: 3')).toBeInTheDocument();
    });
  });

  it('should handle campaign selection', async () => {
    mockWoodpeckerService.getCampaigns.mockResolvedValue(mockCampaigns);

    render(<CampaignSelector onValueChange={mockOnValueChange} />);

    await waitFor(() => {
      expect(screen.getByText('Select a campaign')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('Q1 Outreach Campaign')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Q1 Outreach Campaign'));

    expect(mockOnValueChange).toHaveBeenCalledWith('1', mockCampaigns[0]);
  });

  it('should display error state when campaigns fail to load', async () => {
    const errorMessage = 'Network error';
    mockWoodpeckerService.getCampaigns.mockRejectedValue(new Error(errorMessage));

    render(<CampaignSelector onValueChange={mockOnValueChange} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load campaigns')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('should allow retry when loading fails', async () => {
    mockWoodpeckerService.getCampaigns
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockCampaigns);

    render(<CampaignSelector onValueChange={mockOnValueChange} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load campaigns')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('Select a campaign')).toBeInTheDocument();
    });

    expect(mockWoodpeckerService.getCampaigns).toHaveBeenCalledTimes(2);
  });

  it('should handle empty campaigns list', async () => {
    mockWoodpeckerService.getCampaigns.mockResolvedValue([]);

    render(<CampaignSelector onValueChange={mockOnValueChange} />);

    await waitFor(() => {
      expect(screen.getByText('Select a campaign')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('No campaigns available')).toBeInTheDocument();
    });
  });

  it('should respect disabled prop', async () => {
    mockWoodpeckerService.getCampaigns.mockResolvedValue(mockCampaigns);

    render(<CampaignSelector onValueChange={mockOnValueChange} disabled={true} />);

    const combobox = screen.getByRole('combobox');
    expect(combobox).toBeDisabled();
  });

  it('should use custom placeholder', async () => {
    mockWoodpeckerService.getCampaigns.mockResolvedValue(mockCampaigns);

    render(
      <CampaignSelector
        onValueChange={mockOnValueChange}
        placeholder="Choose your campaign"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Choose your campaign')).toBeInTheDocument();
    });
  });

  it('should display controlled value', async () => {
    mockWoodpeckerService.getCampaigns.mockResolvedValue(mockCampaigns);

    render(
      <CampaignSelector onValueChange={mockOnValueChange} value="1" />
    );

    await waitFor(() => {
      // The select should show the selected campaign
      expect(screen.getByText('Q1 Outreach Campaign')).toBeInTheDocument();
    });
  });

  it('should format prospect count correctly', async () => {
    const singleProspectCampaign: WoodpeckerCampaign[] = [
      {
        campaign_id: 1,
        name: 'Single Prospect Campaign',
        status: 'ACTIVE',
        created_date: '2024-01-01',
        prospects_count: 1,
      },
      {
        campaign_id: 2,
        name: 'No Prospects Campaign',
        status: 'DRAFT',
        created_date: '2024-01-01',
        prospects_count: 0,
      },
    ];

    mockWoodpeckerService.getCampaigns.mockResolvedValue(singleProspectCampaign);

    render(<CampaignSelector onValueChange={mockOnValueChange} />);

    await waitFor(() => {
      expect(screen.getByText('Select a campaign')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('1 prospect')).toBeInTheDocument();
      expect(screen.getByText('0 prospects')).toBeInTheDocument();
    });
  });
});