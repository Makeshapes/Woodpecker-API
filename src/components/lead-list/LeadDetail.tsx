import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ContentGeneration } from '@/components/content-generation/ContentGeneration'
import CampaignSelector from '@/components/export/CampaignSelector'
import WoodpeckerService, {
  type WoodpeckerCampaign,
} from '@/services/woodpeckerService'
import {
  formatMultipleProspects,
  validateWoodpeckerProspect,
} from '@/utils/woodpeckerFormatter'
import type { LeadData, ColumnMapping, LeadStatus } from '@/types/lead'
import { getStandardFields } from '@/utils/fieldMapper'
import { Trash2, Copy, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import type { ClaudeResponse } from '@/services/claudeService'
import ConversionButton from '@/components/content-generation/ConversionButton'
import {
  type PlainTextContent,
  convertFromHtmlContent,
} from '@/utils/contentConverter'
import type { GeneratedContent } from '@/utils/woodpeckerFormatter'
import { Link } from 'react-router-dom'

// Utility function for consistent localStorage key generation
function getLocalStorageKey(lead: LeadData): string {
  // Use email if available, otherwise use lead ID
  const identifier = lead.email || lead.id
  return `lead_content_${btoa(String(identifier)).replace(/[/+=]/g, '')}`
}

interface LeadDetailProps {
  lead: LeadData
  columnMapping: ColumnMapping
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusUpdate?: (leadId: string, status: LeadStatus) => void
  onDeleteLead?: (leadId: string) => void
}

const LeadDetail = memo(function LeadDetail({
  lead,
  columnMapping,
  open,
  onOpenChange,
  onStatusUpdate,
  onDeleteLead,
}: LeadDetailProps) {
  const [generatedContent, setGeneratedContent] =
    useState<ClaudeResponse | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [selectedCampaignId, setSelectedCampaignId] =
    useState<string>('2356837')
  const [selectedCampaignName, setSelectedCampaignName] = useState<string>('')
  const [isExporting, setIsExporting] = useState(false)
  const [woodpeckerService] = useState(() => new WoodpeckerService())
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false)

  // ConversionButton state
  const [plainTextContent, setPlainTextContent] = useState<PlainTextContent>({
    snippet1: '',
    snippet2: '',
    snippet3: '',
    snippet4: '',
    snippet5: '',
    snippet6: '',
    snippet7: '',
  })

  // Extract Woodpecker standard fields and additional data
  const { woodpeckerFields, additionalData } = useMemo(() => {
    const standardFieldNames = getStandardFields()
    const woodpecker: Record<string, string> = {}
    const additional: Record<string, string> = {}

    Object.entries(lead).forEach(([key, value]) => {
      if (['id', 'status', 'selected'].includes(key) || !value) return

      if (standardFieldNames.includes(key as any)) {
        woodpecker[key] = String(value)
      } else {
        additional[key] = String(value)
      }
    })

    return { woodpeckerFields: woodpecker, additionalData: additional }
  }, [lead])

  // Load generated content when modal opens - for ALL statuses to retain content
  useEffect(() => {
    if (open) {
      const loadContent = () => {
        const localStorageKey = getLocalStorageKey(lead)
        console.log(
          '🔍 [LeadDetail] Loading content with key:',
          localStorageKey
        )
        const storedContent = localStorage.getItem(localStorageKey)
        if (storedContent) {
          try {
            const parsed = JSON.parse(storedContent)
            console.log('✅ [LeadDetail] Content loaded from localStorage')
            setGeneratedContent(parsed)
          } catch (error) {
            console.error('Failed to parse stored content:', error)
          }
        } else {
          console.log('❌ [LeadDetail] No content found in localStorage')
        }
      }

      loadContent()

      // Set up interval to refresh content every 2 seconds to catch edits
      const interval = setInterval(loadContent, 2000)
      return () => clearInterval(interval)
    }
  }, [open, lead.id, woodpeckerFields.email])

  // Convert generated content to plain text when available
  useEffect(() => {
    if (generatedContent && !plainTextContent.snippet1) {
      const plainText = convertFromHtmlContent(generatedContent)
      setPlainTextContent(plainText)
    }
  }, [generatedContent, plainTextContent.snippet1])

  // ConversionButton handlers
  const handleConversionComplete = useCallback(
    (htmlContent: ClaudeResponse) => {
      console.log('✅ [LeadDetail] Conversion to HTML completed')
      setGeneratedContent(htmlContent)

      // Store the updated content in localStorage
      const localStorageKey = getLocalStorageKey(lead)
      const dataToStore = {
        ...htmlContent,
        generatedAt: new Date().toISOString(),
      }
      localStorage.setItem(localStorageKey, JSON.stringify(dataToStore))
      console.log(
        '💾 [LeadDetail] Content saved to localStorage with key:',
        localStorageKey
      )

      // Update lead status if callback provided
      onStatusUpdate?.(lead.id, 'approved')
      toast.success('Content approved and converted to HTML format')
    },
    [lead.id, woodpeckerFields.email, onStatusUpdate]
  )

  const handleApprovalStatusChange = useCallback(() => {
    console.log('✅ Updating lead status to "approved" for lead ID:', lead.id)
    onStatusUpdate?.(lead.id, 'approved')
    toast.success('Content approved')
  }, [lead.id, onStatusUpdate])

  // Sync generated HTML content to local plaintext immediately when content is produced
  const handleContentUpdate = useCallback(
    (htmlContent: ClaudeResponse | null) => {
      setGeneratedContent(htmlContent)
      if (htmlContent) {
        const plainText = convertFromHtmlContent(htmlContent)
        setPlainTextContent(plainText)
      } else {
        setPlainTextContent({
          snippet1: '',
          snippet2: '',
          snippet3: '',
          snippet4: '',
          snippet5: '',
          snippet6: '',
          snippet7: '',
        })
      }
    },
    []
  )

  // Create the complete JSON object
  const createCompleteJson = () => {
    const baseData = {
      email: woodpeckerFields.email || '',
      first_name: woodpeckerFields.first_name || '',
      last_name: woodpeckerFields.last_name || '',
      company: woodpeckerFields.company || '',
      title: woodpeckerFields.title || '',
      phone: woodpeckerFields.phone || '',
      website: woodpeckerFields.website || '',
      linkedin_url: woodpeckerFields.linkedin_url || '',
      address: woodpeckerFields.address || '',
      city: woodpeckerFields.city || '',
      state: woodpeckerFields.state || '',
      country: woodpeckerFields.country || '',
      industry: woodpeckerFields.industry || '',
      tags: woodpeckerFields.tags || '',
    }

    if (generatedContent) {
      return {
        ...baseData,
        snippet1: generatedContent.snippet1 || '',
        snippet2: generatedContent.snippet2 || '',
        snippet3: generatedContent.snippet3 || '',
        snippet4: generatedContent.snippet4 || '',
        snippet5: generatedContent.snippet5 || '',
        snippet6: generatedContent.snippet6 || '',
        snippet7: generatedContent.snippet7 || '',
      }
    }

    return baseData
  }

  const handleCopyJson = async () => {
    try {
      const jsonData = JSON.stringify(createCompleteJson(), null, 2)
      await navigator.clipboard.writeText(jsonData)
      toast.success('Copied to clipboard')
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy JSON:', error)
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleCampaignChange = (
    campaignId: string,
    campaign: WoodpeckerCampaign | null
  ) => {
    setSelectedCampaignId(campaignId)
    setSelectedCampaignName(campaign?.name || '')
  }

  const handleExportToCampaign = async () => {
    console.log('🚀 LeadDetail: Export to Campaign clicked', {
      selectedCampaignId,
      hasGeneratedContent: !!generatedContent,
      leadId: lead.id,
    })

    if (!selectedCampaignId || !generatedContent) {
      console.error('❌ LeadDetail: Missing requirements for export', {
        selectedCampaignId,
        hasGeneratedContent: !!generatedContent,
      })
      toast.error('Please select a campaign and ensure content is generated')
      return
    }

    setIsExporting(true)

    try {
      console.log('📋 LeadDetail: Formatting prospects for export...')
      console.log('📊 LeadDetail: Input data:', {
        lead: lead,
        generatedContent: generatedContent,
      })

      // Create a properly mapped lead object with woodpecker fields
      const mappedLead: LeadData = {
        ...lead,
        // Override with mapped standard fields
        email: woodpeckerFields.email || lead.email,
        company: woodpeckerFields.company || '',
        contact:
          `${woodpeckerFields.first_name || ''} ${woodpeckerFields.last_name || ''}`.trim() ||
          '',
        title: woodpeckerFields.title || '',
        phone: woodpeckerFields.phone || '',
        city: woodpeckerFields.city || '',
        state: woodpeckerFields.state || '',
        country: woodpeckerFields.country || '',
        linkedin: woodpeckerFields.linkedin_url || '',
        industry: woodpeckerFields.industry || '',
        website: woodpeckerFields.website || '',
      }

      // Format the prospect with generated content using mapped data
      const prospects = formatMultipleProspects(
        [mappedLead],
        (leadId): GeneratedContent | undefined =>
          leadId === lead.id && generatedContent
            ? (generatedContent as unknown as GeneratedContent)
            : undefined
      )
      console.log('✅ LeadDetail: Formatted prospects:', prospects)
      console.log('🔍 LeadDetail: First prospect details:', {
        email: prospects[0]?.email,
        first_name: prospects[0]?.first_name,
        last_name: prospects[0]?.last_name,
        company: prospects[0]?.company,
        title: prospects[0]?.title,
        linkedin_url: prospects[0]?.linkedin_url,
        hasSnippet1: !!prospects[0]?.snippet1,
        hasSnippet2: !!prospects[0]?.snippet2,
        snippet1Preview: prospects[0]?.snippet1?.substring(0, 50),
        allKeys: Object.keys(prospects[0] || {}),
      })

      console.log('🔍 LeadDetail: Validating prospect data...')
      // Validate the prospect
      const validation = validateWoodpeckerProspect(prospects[0])
      console.log('📊 LeadDetail: Validation results:', validation)

      if (!validation.isValid) {
        console.error('❌ LeadDetail: Validation failed:', validation.errors)
        toast.error(`Validation failed: ${validation.errors.join(', ')}`)
        return
      }

      console.log('📡 LeadDetail: Calling Woodpecker API to export prospect...')
      // Export to Woodpecker
      const result = await woodpeckerService.addProspectsToCampaign(
        prospects,
        parseInt(selectedCampaignId)
      )
      console.log('📈 LeadDetail: Export result:', result)

      if (result.succeeded > 0) {
        console.log('✅ LeadDetail: Export successful!')
        onStatusUpdate?.(lead.id, 'exported')
        toast.success(
          `Successfully exported to ${selectedCampaignName || 'campaign'}!`,
          {
            description: `Lead added to campaign ${selectedCampaignId}`,
          }
        )
      } else {
        console.error('❌ LeadDetail: Export failed with no successes:', result)
        toast.error('Export failed', {
          description: result.errors[0]?.error || 'Unknown error occurred',
        })
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Export failed', {
        description:
          error instanceof Error ? error.message : 'Unknown error occurred',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'imported':
        return 'bg-blue-100 text-blue-800'
      case 'drafted':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'exported':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="min-w-[700px] overflow-y-auto">
        <SheetHeader className="fixed bg-background w-full z-10 border-b">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 justify-between">
                <SheetTitle className="text-xl">
                  {[woodpeckerFields.first_name, woodpeckerFields.last_name]
                    .filter(Boolean)
                    .join(' ') ||
                    woodpeckerFields.company ||
                    'Lead Details'}
                </SheetTitle>
              </div>
              <SheetDescription>
                {woodpeckerFields.title || ''}{' '}
                {woodpeckerFields.title && woodpeckerFields.company
                  ? ' - '
                  : ''}{' '}
                {woodpeckerFields.company}{' '}
                {woodpeckerFields.linkedin_url && (
                  <>
                    {' - '}
                    <Link
                      className="text-blue-600 hover:text-blue-800 underline"
                      to={woodpeckerFields.linkedin_url}
                      target="_blank"
                    >
                      LinkedIn
                    </Link>
                  </>
                )}
              </SheetDescription>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getStatusColor(lead.status)}>
                  {lead.status}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 px-8 pt-32">
          {/* Lead Information - Collapsible */}
          <Card>
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setShowAdditionalInfo(!showAdditionalInfo)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Lead Information</CardTitle>
                  <CardDescription>
                    All lead data from your import
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {showAdditionalInfo ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            {showAdditionalInfo && (
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Woodpecker Standard Fields */}
                  {Object.entries(woodpeckerFields).map(([field, value]) => (
                    <div key={field} className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground capitalize">
                        {field
                          .replace('_', ' ')
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </label>
                      <div className="text-sm border rounded p-2 bg-muted/50">
                        {(field === 'linkedin_url' || field === 'website') &&
                        value ? (
                          <a
                            href={
                              value.startsWith('http')
                                ? value
                                : `https://${value}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline break-all inline-block max-w-full"
                          >
                            {value}
                          </a>
                        ) : (
                          value || '-'
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Additional Custom Fields */}
                  {Object.entries(additionalData).map(([field, value]) => (
                    <div key={field} className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        {field}
                        <Badge variant="outline" className="ml-2 text-xs">
                          Custom
                        </Badge>
                      </label>
                      <div className="text-sm border rounded p-2 bg-muted/50 max-h-24 overflow-y-auto">
                        {value || '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>

          <ContentGeneration
            lead={{ ...lead, ...woodpeckerFields }}
            columnMapping={columnMapping}
            onStatusUpdate={onStatusUpdate}
            onContentUpdate={handleContentUpdate}
          />

          {/* JSON Preview Section */}
        </div>

        <SheetFooter className="border-t pt-4">
          {(lead.status === 'drafted' ||
            lead.status === 'approved' ||
            lead.status === 'exported') && (
            <>
              {/* Determine if any plaintext content exists to enable Approve */}
              {(() => {
                const hasAnyPlainText = Boolean(
                  plainTextContent.snippet1 ||
                    plainTextContent.snippet2 ||
                    plainTextContent.snippet3 ||
                    plainTextContent.snippet4 ||
                    plainTextContent.snippet5 ||
                    plainTextContent.snippet6 ||
                    plainTextContent.snippet7
                )
                return (
                  <ConversionButton
                    plainTextContent={plainTextContent}
                    leadData={{
                      first_name: woodpeckerFields.first_name || 'There',
                      last_name: woodpeckerFields.last_name || '',
                      company: woodpeckerFields.company || '',
                      title: woodpeckerFields.title || '',
                      email: woodpeckerFields.email || '',
                      industry:
                        additionalData.Industry ||
                        woodpeckerFields.industry ||
                        'Technology',
                      linkedin_url: woodpeckerFields.linkedin_url || '',
                      tags: `#${additionalData.Department || 'Business'} #${woodpeckerFields.company?.replace(/\s+/g, '')} #${(additionalData.Title || woodpeckerFields.title || '').replace(/\s+/g, '')}`,
                    }}
                    onConversionComplete={handleConversionComplete}
                    onShowJson={() => {}}
                    onStatusChange={handleApprovalStatusChange}
                    disabled={!hasAnyPlainText}
                  />
                )
              })()}
              {lead.status === 'approved' ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Generated Content JSON
                        </CardTitle>
                        <CardDescription>
                          Complete lead data with generated email sequence -
                          updates live as you edit
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyJson}
                          className="gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          {copySuccess ? 'Copied!' : 'Copy JSON'}
                        </Button>
                        <div className="flex items-center gap-2">
                          <CampaignSelector
                            value={selectedCampaignId}
                            onValueChange={handleCampaignChange}
                            className="!w-32 overflow-hidden truncate"
                            placeholder="Select campaign..."
                          />
                          <Button
                            size="sm"
                            onClick={handleExportToCampaign}
                            disabled={
                              isExporting ||
                              !selectedCampaignId ||
                              !generatedContent
                            }
                            className="gap-2"
                          >
                            <Download className="h-4 w-4" />
                            {isExporting
                              ? 'Exporting...'
                              : 'Export to Campaign'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {JSON.stringify(createCompleteJson(), null, 2)}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <></>
              )}
            </>
          )}
          <div className="flex gap-2 justify-end w-full">
            {lead.status === 'exported' && (
              <Button
                variant="destructive"
                onClick={() => {
                  onDeleteLead?.(lead.id)
                  onOpenChange(false)
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove from List
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
})

export { LeadDetail }
