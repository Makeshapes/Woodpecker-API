import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Users, Loader2 } from 'lucide-react';
import WoodpeckerService from '@/services/woodpeckerService';
import type { WoodpeckerCampaign } from '@/services/woodpeckerService';

interface CampaignSelectorProps {
  value?: string;
  onValueChange: (campaignId: string, campaign: WoodpeckerCampaign | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function CampaignSelector({
  value,
  onValueChange,
  disabled = false,
  placeholder = "Select a campaign",
  className,
}: CampaignSelectorProps) {
  const [campaigns, setCampaigns] = useState<WoodpeckerCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [woodpeckerService] = useState(() => new WoodpeckerService());

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const campaignList = await woodpeckerService.getCampaigns();
      setCampaigns(campaignList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load campaigns';
      setError(errorMessage);
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (selectedValue: string) => {
    const selectedCampaign = campaigns.find(
      campaign => campaign.campaign_id.toString() === selectedValue
    );
    onValueChange(selectedValue, selectedCampaign || null);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const formatProspectCount = (count?: number) => {
    if (count === undefined || count === null) return '';
    return count === 1 ? '1 prospect' : `${count} prospects`;
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 border border-red-200 rounded-md bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800">Failed to load campaigns</p>
          <p className="text-xs text-red-600">{error}</p>
        </div>
        <button
          onClick={loadCampaigns}
          disabled={loading}
          className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-800 rounded border border-red-300 disabled:opacity-50"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <Select
      value={value}
      onValueChange={handleValueChange}
      disabled={disabled || loading}
    >
      <SelectTrigger className={className}>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <SelectValue placeholder={loading ? "Loading campaigns..." : placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {campaigns.length === 0 && !loading ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No campaigns available
          </div>
        ) : (
          campaigns.map((campaign) => (
            <SelectItem
              key={campaign.campaign_id}
              value={campaign.campaign_id.toString()}
              className="py-2"
            >
              <div className="flex items-center justify-between w-full pr-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {campaign.name} - {campaign.campaign_id}
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-xs px-2 py-0.5 ${getStatusColor(campaign.status)}`}
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                  {campaign.prospects_count !== undefined && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <Users className="h-3 w-3" />
                      <span>{formatProspectCount(campaign.prospects_count)}</span>
                    </div>
                  )}
                </div>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

export default CampaignSelector;