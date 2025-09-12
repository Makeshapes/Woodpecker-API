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
import { ContentGeneration } from '@/components/content-generation/ContentGeneration'
import type { LeadData, ColumnMapping, LeadStatus } from '@/types/lead'
import { Trash2, Copy, Download } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import type { ClaudeResponse } from '@/services/claudeService'

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

  // Group fields by type using useMemo to prevent infinite re-renders
  const { standardData, customData } = useMemo(() => {
    const standardFields = [
      'company',
      'contact',
      'email',
      'title',
      'department',
      'phone',
      'city',
      'state',
      'country',
      'linkedin',
    ]
    const standard: Record<string, string> = {}
    const custom: Record<string, string> = {}

    // Separate standard and custom fields
    Object.entries(lead).forEach(([key, value]) => {
      if (['id', 'status', 'selected'].includes(key)) return

      const mappedField = columnMapping[key]
      if (mappedField && standardFields.includes(mappedField)) {
        standard[mappedField] = String(value)
      } else {
        custom[key] = String(value)
      }
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

  // Create the complete JSON object
  const createCompleteJson = () => {
    const baseData = {
      email: standardData.email || '',
      first_name: standardData.contact?.split(' ')[0] || '',
      last_name: standardData.contact?.split(' ').slice(1).join(' ') || '',
      company: standardData.company || '',
      title: standardData.title || '',
      linkedin_url: standardData.linkedin || '',
      tags: `#${standardData.department || 'Business'} #${standardData.company?.replace(/\s+/g, '')} #${standardData.title?.replace(/\s+/g, '')}`,
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
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy JSON:', error)
    }
  }

  const handleExport = () => {
    alert(
      'This is where Woodpecker API would be. A user would be added to a campaign.'
    )
    onStatusUpdate?.(lead.id, 'exported')
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'imported':
        return 'bg-blue-100 text-blue-800'
      case 'drafted':
        return 'bg-yellow-100 text-yellow-800'
      case 'exported':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="min-w-6xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl">
                {standardData.contact || standardData.company || 'Lead Details'}
              </SheetTitle>
              <SheetDescription>
                Complete information for this lead
              </SheetDescription>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getStatusColor(lead.status)}>
                  {lead.status}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 px-8">
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
                      {value || '-'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <ContentGeneration
            lead={{ ...lead, ...standardData }}
            onStatusUpdate={onStatusUpdate}
          />
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
          {(lead.status === 'drafted' || lead.status === 'exported') && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Generated Content JSON
                    </CardTitle>
                    <CardDescription>
                      Complete lead data with generated email sequence - updates
                      live as you edit
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
                    {lead.status !== 'exported' ? (
                      <Button
                        size="sm"
                        onClick={handleExport}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export to Campaign
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        Exported ✓
                      </Button>
                    )}
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
          )}{' '}
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
