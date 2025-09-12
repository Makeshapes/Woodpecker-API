import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sparkles, Edit, Save, X, Eye, Copy } from 'lucide-react'
import { contentGenerationService } from '@/services/contentGenerationService'
import type { LeadData } from '@/types/lead'
import type { ClaudeResponse } from '@/services/claudeService'

interface ContentGenerationProps {
  lead: LeadData
  onStatusUpdate?: (leadId: string, status: LeadData['status']) => void
}

interface SnippetConfig {
  key: keyof ClaudeResponse
  label: string
  description: string
  isHtml: boolean
  timeline: string
}

const SNIPPETS: SnippetConfig[] = [
  {
    key: 'snippet1',
    label: 'Email Subject',
    description: 'Day 1 - Initial outreach subject line',
    isHtml: false,
    timeline: 'Day 1',
  },
  {
    key: 'snippet2',
    label: 'Email Body',
    description: 'Day 1 - Initial outreach email body',
    isHtml: true,
    timeline: 'Day 1',
  },
  {
    key: 'snippet3',
    label: 'LinkedIn Message',
    description: 'Day 3 - LinkedIn connection message',
    isHtml: false,
    timeline: 'Day 3',
  },
  {
    key: 'snippet4',
    label: 'Bump Email',
    description: 'Day 7 - First follow-up email',
    isHtml: true,
    timeline: 'Day 7',
  },
  {
    key: 'snippet5',
    label: 'Follow-up Email',
    description: 'Day 12 - Second follow-up email',
    isHtml: true,
    timeline: 'Day 12',
  },
  {
    key: 'snippet6',
    label: 'Second Bump',
    description: 'Day 17 - Third follow-up email',
    isHtml: true,
    timeline: 'Day 17',
  },
  {
    key: 'snippet7',
    label: 'Breakup Email',
    description: 'Day 25 - Final follow-up email',
    isHtml: true,
    timeline: 'Day 25',
  },
]

export function ContentGeneration({
  lead,
  onStatusUpdate,
}: ContentGenerationProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [content, setContent] = useState<ClaudeResponse | null>(null)
  const [editingSnippet, setEditingSnippet] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState<Partial<ClaudeResponse>>(
    {}
  )
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview')
  const [error, setError] = useState<string | null>(null)

  // Load existing content on mount
  useEffect(() => {
    const leadId = btoa(String(lead.email || lead.id)).replace(/[/+=]/g, '')
    const existingContent = contentGenerationService.getLeadContent(leadId)
    if (existingContent) {
      setContent(existingContent)
    }
  }, [lead.email, lead.id])

  const generateContent = async () => {
    if (!lead.email || !lead.company) {
      setError(
        'Lead must have email and company information to generate content'
      )
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const leadData = {
        first_name: getFieldValue('contact')?.split(' ')[0] || 'There',
        last_name:
          getFieldValue('contact')?.split(' ').slice(1).join(' ') || '',
        company: getFieldValue('company') || '',
        title: getFieldValue('title') || '',
        email: getFieldValue('email') || '',
        industry: getFieldValue('industry') || 'Technology',
        linkedin_url: getFieldValue('linkedin') || '',
      }

      const result = await contentGenerationService.generateForLead(leadData)

      if (result.status === 'completed' && result.content) {
        setContent(result.content)
        onStatusUpdate?.(lead.id, 'drafted')
      } else {
        setError(result.error || 'Failed to generate content')
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const getFieldValue = (field: string): string => {
    // Try to get the value from lead data, handling potential column mapping
    const directValue = (lead as any)[field]
    if (directValue) return String(directValue)

    // Try common variations
    const variations = {
      company: ['company_name', 'organization', 'company'],
      contact: ['name', 'full_name', 'contact_name', 'first_name'],
      email: ['email_address', 'email'],
      title: ['job_title', 'position', 'title'],
      industry: ['industry', 'sector', 'vertical'],
      linkedin: ['linkedin_url', 'linkedin_profile', 'linkedin'],
    }

    const fieldVariations = variations[field as keyof typeof variations] || [
      field,
    ]

    for (const variant of fieldVariations) {
      const value = (lead as any)[variant]
      if (value) return String(value)
    }

    return ''
  }

  const startEditing = (snippetKey: string) => {
    setEditingSnippet(snippetKey)
    setEditedContent({
      ...editedContent,
      [snippetKey]: content?.[snippetKey as keyof ClaudeResponse] || '',
    })
  }

  const saveEdit = (snippetKey: string) => {
    if (!content) return

    const updatedContent = {
      ...content,
      [snippetKey]: editedContent[snippetKey as keyof ClaudeResponse],
    }

    setContent(updatedContent)

    // Update localStorage
    const leadId = btoa(String(lead.email || lead.id)).replace(/[/+=]/g, '')
    const data = {
      ...updatedContent,
      generatedAt: new Date().toISOString(),
    }
    localStorage.setItem(`lead_content_${leadId}`, JSON.stringify(data))

    setEditingSnippet(null)
  }

  const cancelEdit = () => {
    setEditingSnippet(null)
    setEditedContent({})
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }

  const renderContent = (snippet: SnippetConfig) => {
    const snippetContent = content?.[snippet.key]
    const isEditing = editingSnippet === snippet.key
    const displayContent = isEditing
      ? editedContent[snippet.key] || ''
      : snippetContent || ''

    if (!snippetContent && !isEditing) return null

    return (
      <Card key={snippet.key} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {snippet.timeline}
                </Badge>
                {snippet.label}
              </CardTitle>
              <CardDescription className="text-xs">
                {snippet.description}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              {!isEditing && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(String(snippetContent))}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditing(String(snippet.key))}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </>
              )}
              {isEditing && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => saveEdit(String(snippet.key))}
                    className="h-8 w-8 p-0"
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelEdit}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isEditing ? (
            <Textarea
              value={String(displayContent)}
              onChange={(e) =>
                setEditedContent({
                  ...editedContent,
                  [snippet.key]: e.target.value,
                })
              }
              rows={snippet.isHtml ? 6 : 3}
              className="min-h-[80px]"
            />
          ) : (
            <div className="space-y-2">
              {snippet.isHtml ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Preview:
                    </div>
                    <div
                      className="text-sm border rounded p-3 bg-muted/20 min-h-[80px]"
                      dangerouslySetInnerHTML={{
                        __html: String(displayContent),
                      }}
                    />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      HTML Source:
                    </div>
                    <div className="text-xs font-mono border rounded p-3 bg-muted/50 min-h-[80px] overflow-auto">
                      {String(displayContent)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm border rounded p-3 bg-muted/20 min-h-[60px]">
                  {String(displayContent)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Don't show anything if lead doesn't have required fields
  const hasRequiredFields =
    lead.email && (getFieldValue('company') || getFieldValue('contact'))

  if (!hasRequiredFields) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Email Sequence Content
            </CardTitle>
            <CardDescription>
              AI-generated 6-touchpoint email sequence with 7 content snippets
            </CardDescription>
          </div>
          {content && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setViewMode(viewMode === 'preview' ? 'edit' : 'preview')
                }
              >
                {viewMode === 'preview' ? (
                  <Edit className="h-4 w-4 mr-2" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                {viewMode === 'preview' ? 'Edit Mode' : 'Preview Mode'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
            {error}
          </div>
        )}

        {!content && !isGenerating && (
          <div className="text-center py-6">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Generate Email Sequence
            </h3>
            <p className="text-muted-foreground mb-4">
              Create a personalized 6-touchpoint email sequence for{' '}
              {getFieldValue('contact') || 'this lead'}
              {getFieldValue('company') && ` at ${getFieldValue('company')}`}
            </p>
            <Button onClick={generateContent} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Content
            </Button>
          </div>
        )}

        {isGenerating && (
          <div className="text-center py-6">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-4" />
            <h3 className="text-lg font-medium mb-2">Generating Content...</h3>
            <p className="text-muted-foreground">
              Creating personalized email sequence for{' '}
              {getFieldValue('contact') || 'this lead'}
            </p>
          </div>
        )}

        {content && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <p className="text-sm font-medium">Generated Content</p>
                <p className="text-xs text-muted-foreground">
                  7 snippets for 6-touchpoint email sequence
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={generateContent}
                disabled={isGenerating}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Regenerate
              </Button>
            </div>

            <div className="space-y-4">{SNIPPETS.map(renderContent)}</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
