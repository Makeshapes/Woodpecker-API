import { useState, useEffect, useCallback } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Users, Loader2 } from 'lucide-react'
import type { WoodpeckerCampaign } from '@/main/services/woodpeckerService'
import { Button } from '../ui/button'

interface CampaignSelectorProps {
  value?: string
  onValueChange: (
    campaignId: string,
    campaign: WoodpeckerCampaign | null
  ) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function CampaignSelector({
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Select a campaign',
  className,
}: CampaignSelectorProps) {
  const [campaigns, setCampaigns] = useState<WoodpeckerCampaign[]>([])
  const [allCampaigns, setAllCampaigns] = useState<WoodpeckerCampaign[]>([])
  const [displayedCount, setDisplayedCount] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCampaigns = useCallback(async () => {
    console.log('🚀 CampaignSelector: Starting to load campaigns...')
    try {
      setLoading(true)
      setError(null)
      console.log(
        '📡 CampaignSelector: Calling Woodpecker API via IPC...'
      )
      const response = await window.api.woodpecker.getCampaigns()

      if (!response.success) {
        throw new Error(response.error || 'Failed to load campaigns')
      }

      const campaignList = response.data
      console.log('✅ CampaignSelector: Received campaigns:', {
        count: campaignList.length,
        campaigns: campaignList,
      })

      // Sort campaigns by created_date (most recent first)
      const sortedCampaigns = campaignList.sort(
        (a, b) =>
          new Date(b.created_date).getTime() -
          new Date(a.created_date).getTime()
      )
      console.log('📋 CampaignSelector: Sorted campaigns by date')

      setAllCampaigns(sortedCampaigns)
      setCampaigns(sortedCampaigns.slice(0, displayedCount))
      console.log(
        `📊 CampaignSelector: Displaying first ${displayedCount} campaigns`
      )
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load campaigns'
      setError(errorMessage)
      console.error('❌ CampaignSelector: Failed to load campaigns:', {
        error: err,
        message: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
      })
    } finally {
      setLoading(false)
      console.log('🏁 CampaignSelector: Loading complete')
    }
  }, [displayedCount])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  // Update displayed campaigns when displayedCount changes
  useEffect(() => {
    if (allCampaigns.length > 0) {
      setCampaigns(allCampaigns.slice(0, displayedCount))
    }
  }, [allCampaigns, displayedCount])

  const handleLoadMore = () => {
    setDisplayedCount((prev) => prev + 5)
  }

  const handleValueChange = (selectedValue: string) => {
    console.log('🎯 CampaignSelector: Campaign selected:', selectedValue)
    const selectedCampaign = allCampaigns.find(
      (campaign) => campaign.campaign_id.toString() === selectedValue
    )
    console.log(
      '📌 CampaignSelector: Found campaign details:',
      selectedCampaign
    )
    onValueChange(selectedValue, selectedCampaign || null)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 hover:bg-green-200'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
      case 'completed':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
      case 'draft':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    }
  }

  const formatProspectCount = (count?: number) => {
    if (count === undefined || count === null) return ''
    return count === 1 ? '1 prospect' : `${count} prospects`
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 border border-red-200 rounded-md bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800">
            Failed to load campaigns
          </p>
          <p className="text-xs text-red-600">{error}</p>
        </div>
        <Button
          onClick={loadCampaigns}
          disabled={loading}
          className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-800 rounded border border-red-300 disabled:opacity-50"
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <Select
      value={value}
      onValueChange={handleValueChange}
      disabled={disabled || loading}
    >
      <SelectTrigger className={className} size="sm">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          )}
          <SelectValue
            placeholder={loading ? 'Loading campaigns...' : placeholder}
            className="truncate min-w-0 flex-1"
          />
        </div>
      </SelectTrigger>
      <SelectContent>
        {campaigns.length === 0 && !loading ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No campaigns available
          </div>
        ) : (
          <>
            {campaigns.map((campaign) => (
              <SelectItem
                key={campaign.campaign_id}
                value={campaign.campaign_id.toString()}
                className="py-2"
              >
                <div className="flex items-center justify-between w-full pr-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {campaign.name} - {campaign.campaign_id}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs px-2 py-0.5 ${getStatusColor(campaign.status)}`}
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                    {campaign.prospects_count !== undefined && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Users className="h-3 w-3" />
                        <span>
                          {formatProspectCount(campaign.prospects_count)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </SelectItem>
            ))}
            {displayedCount < allCampaigns.length && (
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  Load more campaigns ({allCampaigns.length - displayedCount}{' '}
                  remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </SelectContent>
    </Select>
  )
}

export default CampaignSelector
