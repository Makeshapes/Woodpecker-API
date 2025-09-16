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
import { Trash2, Copy, Download } from 'lucide-react'
import { useState, useEffect, useMemo, useCallback } from 'react'
import type { ClaudeResponse } from '@/services/claudeService'
import ConversionButton from '@/components/content-generation/ConversionButton'
import {
  type PlainTextContent,
  convertFromHtmlContent,
} from '@/utils/contentConverter'
import type { GeneratedContent } from '@/utils/woodpeckerFormatter'
import { Link } from 'react-router-dom'

interface LeadDetailProps {
  lead: LeadData
  columnMapping: ColumnMapping
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusUpdate?: (leadId: string, status: LeadStatus) => void
  onDeleteLead?: (leadId: string) => void
}

export function LeadDetail({
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

  // Group fields by type using useMemo to prevent infinite re-renders
  const { standardData, customData } = useMemo(() => {
    console.log('🔍 [LeadDetail] Field categorization debug:', {
      leadKeys: Object.keys(lead),
      leadData: lead,
      columnMapping: columnMapping,
      hasColumnMapping: !!columnMapping,
    })

    const contactInfoFields = [
      'company',
      'contact',
      'email',
      'title',
      'phone',
      'city',
      'state',
      'country',
      'linkedin',
      'industry',
      'website',
    ]
    const standard: Record<string, string> = {}
    const custom: Record<string, string> = {}

    // Separate contact info and additional fields
    Object.entries(lead).forEach(([key, value]) => {
      if (['id', 'status', 'selected'].includes(key)) return

      const mappedField = columnMapping[key]

      // Check if this is a direct standard field (already processed from DB)
      const isDirectStandardField = contactInfoFields.includes(key)

      console.log(`🔍 [LeadDetail] Processing field: ${key}`, {
        originalValue: value,
        mappedField: mappedField,
        isDirectStandardField: isDirectStandardField,
        isMappedToContactField: mappedField ? contactInfoFields.includes(mappedField) : false,
      })

      if (isDirectStandardField) {
        // Direct standard field (company, email, title, etc.)
        standard[key] = String(value)
        console.log(`✅ [LeadDetail] Added to Contact Info (direct): ${key} = ${String(value)}`)
      } else if (mappedField && contactInfoFields.includes(mappedField)) {
        // CSV field mapped to standard field
        standard[mappedField] = String(value)
        console.log(`✅ [LeadDetail] Added to Contact Info (mapped): ${mappedField} = ${String(value)}`)
      } else {
        // Additional information
        custom[key] = String(value)
        console.log(`📋 [LeadDetail] Added to Additional Info: ${key} = ${String(value)}`)
      }
    })

    console.log('🔍 [LeadDetail] Final categorization:', {
      standardData: standard,
      customData: custom,
      standardDataKeys: Object.keys(standard),
      customDataKeys: Object.keys(custom),
    })

    return { standardData: standard, customData: custom }
  }, [lead, columnMapping])

  // Load generated content when modal opens
  useEffect(() => {
    if (open && (lead.status === 'drafted' || lead.status === 'exported')) {
      const loadContent = () => {
        const leadId = btoa(String(standardData.email || lead.id)).replace(
          /[/+=]/g,
          ''
        )
        const storedContent = localStorage.getItem(`lead_content_${leadId}`)
        if (storedContent) {
          try {
            const parsed = JSON.parse(storedContent)
            setGeneratedContent(parsed)
          } catch (error) {
            console.error('Failed to parse stored content:', error)
          }
        }
      }

      loadContent()

      // Set up interval to refresh content every 2 seconds to catch edits
      const interval = setInterval(loadContent, 2000)
      return () => clearInterval(interval)
    }
  }, [open, lead.status, lead.id, standardData.email])

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

      // Store the updated content
      const leadId = btoa(String(standardData.email || lead.id)).replace(
        /[/+=]/g,
        ''
      )
      localStorage.setItem(
        `lead_content_${leadId}`,
        JSON.stringify(htmlContent)
      )

      // Update lead status if callback provided
      onStatusUpdate?.(lead.id, 'approved')
      toast.success('Content approved and converted to HTML format')
    },
    [lead.id, standardData.email, onStatusUpdate]
  )

  const handleApprovalStatusChange = useCallback(() => {
    console.log('✅ Updating lead status to "approved" for lead ID:', lead.id)
    onStatusUpdate?.(lead.id, 'approved')
    toast.success('Content approved')
  }, [lead.id, onStatusUpdate])

  // Create the complete JSON object
  const createCompleteJson = () => {
    const resolvedTitle =
      standardData.title && standardData.title !== (customData.Title || '')
        ? standardData.title
        : ''

    const baseData = {
      email: standardData.email || '',
      first_name: standardData.contact?.split(' ')[0] || '',
      last_name: standardData.contact?.split(' ').slice(1).join(' ') || '',
      company: standardData.company || '',
      title: resolvedTitle,
      linkedin_url: standardData.linkedin || '',
      tags: `#${standardData.department || 'Business'} #${standardData.company?.replace(/\s+/g, '')} #${(customData.Title || standardData.title || '').replace(/\s+/g, '')}`,
      industry: customData.Industry || standardData.department || 'Technology',
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

      // Create a properly mapped lead object with standardData fields
      const mappedLead: LeadData = {
        ...lead,
        // Override with mapped standard fields
        email: standardData.email || lead.email,
        company: standardData.company || '',
        contact: standardData.contact || '',
        title: standardData.title || '',
        phone: standardData.phone || '',
        city: standardData.city || '',
        state: standardData.state || '',
        country: standardData.country || '',
        linkedin: standardData.linkedin || '',
        industry: standardData.industry || '',
        website: standardData.website || '',
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
      <SheetContent side="right" className="min-w-6xl overflow-y-auto">
        <SheetHeader className="fixed bg-background w-full z-10 border-b">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 justify-between">
                <SheetTitle className="text-xl">
                  {standardData.contact ||
                    standardData.company ||
                    'Lead Details'}
                </SheetTitle>
              </div>
              <SheetDescription>
                {standardData.title || ''} - {standardData.company} -{' '}
                <Link
                  className="size-4 text-blue-600 hover:text-blue-800"
                  to={standardData.linkedin || ''}
                  target="_blank"
                >
                  Linkedin
                </Link>
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
          <ContentGeneration
            lead={{ ...lead, ...standardData }}
            columnMapping={columnMapping}
            onStatusUpdate={onStatusUpdate}
          />

          {/* Standard Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
              <CardDescription>Standard lead data fields</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(standardData).map(([field, value]) => (
                  <div key={field} className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground capitalize">
                      {field.replace('_', ' ')}
                    </label>
                    <div className="text-sm border rounded p-2 bg-muted/50">
                      {field === 'linkedin' && value ? (
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
              </div>
            </CardContent>
          </Card>
          {/* Custom Fields */}
          {Object.keys(customData).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Additional Information
                </CardTitle>
                <CardDescription>
                  Custom fields from your CSV import
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(customData).map(([field, value]) => (
                    <div key={field} className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        {field}
                      </label>
                      <div className="text-sm border rounded p-2 bg-muted/50 max-h-24 overflow-y-auto">
                        {value || '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* JSON Preview Section */}
        </div>

        <SheetFooter className="border-t pt-4">
          {(lead.status === 'drafted' ||
            lead.status === 'approved' ||
            lead.status === 'exported') && (
            <>
              {plainTextContent.snippet1 && (
                <ConversionButton
                  plainTextContent={plainTextContent}
                  leadData={{
                    first_name: standardData.contact?.split(' ')[0] || 'There',
                    last_name:
                      standardData.contact?.split(' ').slice(1).join(' ') || '',
                    company: standardData.company || '',
                    title: standardData.title || '',
                    email: standardData.email || '',
                    industry:
                      customData.Industry ||
                      standardData.department ||
                      'Technology',
                    linkedin_url: standardData.linkedin || '',
                    tags: `#${standardData.department || 'Business'} #${standardData.company?.replace(/\s+/g, '')} #${(customData.Title || standardData.title || '').replace(/\s+/g, '')}`,
                  }}
                  onConversionComplete={handleConversionComplete}
                  onShowJson={() => {}}
                  onStatusChange={handleApprovalStatusChange}
                />
              )}
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
}
