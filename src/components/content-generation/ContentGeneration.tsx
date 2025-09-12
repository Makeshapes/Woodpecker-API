import { useState, useEffect, useCallback } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Loader2,
  Sparkles,
  Edit,
  Save,
  X,
  Eye,
  Copy,
  WandSparkles,
  Send,
} from 'lucide-react'
import { contentGenerationService } from '@/services/contentGenerationService'
import type { LeadData } from '@/types/lead'
import type { ClaudeResponse } from '@/services/claudeService'

interface ContentGenerationProps {
  lead: LeadData
  onStatusUpdate?: (leadId: string, status: LeadData['status']) => void
  onContentUpdate?: (content: ClaudeResponse | null) => void
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
    description: 'Day 2-3 - LinkedIn connection message',
    isHtml: false,
    timeline: 'Day 2-3',
  },
  {
    key: 'snippet4',
    label: 'Bump Email',
    description: 'Day 5 - Email bump (reply to original)',
    isHtml: true,
    timeline: 'Day 5',
  },
  {
    key: 'snippet5',
    label: 'Follow-up Email',
    description: 'Day 9-10 - Follow-up with Shapeshifters panel angle',
    isHtml: true,
    timeline: 'Day 9-10',
  },
  {
    key: 'snippet6',
    label: 'Second Bump',
    description: 'Day 13 - Bump with panel discussion offer',
    isHtml: true,
    timeline: 'Day 13',
  },
  {
    key: 'snippet7',
    label: 'Breakup Email',
    description: 'Day 20 - Final graceful breakup email',
    isHtml: true,
    timeline: 'Day 20',
  },
]

export function ContentGeneration({
  lead,
  onStatusUpdate,
  onContentUpdate,
}: ContentGenerationProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [content, setContent] = useState<ClaudeResponse | null>(null)
  const [editingSnippet, setEditingSnippet] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState<Partial<ClaudeResponse>>(
    {}
  )
  const [editingPreview, setEditingPreview] = useState<string | null>(null)
  const [previewContent, setPreviewContent] = useState<Partial<ClaudeResponse>>(
    {}
  )
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview')
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [isEditingSystemPrompt, setIsEditingSystemPrompt] = useState(false)
  const [editedSystemPrompt, setEditedSystemPrompt] = useState('')

  const getFieldValue = useCallback(
    (field: string): string => {
      // Try to get the value from lead data, handling potential column mapping
      const directValue = (lead as Record<string, unknown>)[field]
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
        const value = (lead as Record<string, unknown>)[variant]
        if (value) return String(value)
      }

      return ''
    },
    [lead]
  )

  // Load existing content on mount
  useEffect(() => {
    const leadId = btoa(String(lead.email || lead.id)).replace(/[/+=]/g, '')
    const existingContent = contentGenerationService.getLeadContent(leadId)
    if (existingContent) {
      setContent(existingContent)
      onContentUpdate?.(existingContent)
    }

    // Set default system prompt
    const defaultSystemPrompt = `# Makeshapes Cold Email Sequence Generator - System Prompt

## Your Role
You are an expert B2B sales copywriter specializing in enterprise Learning & Development solutions. You generate personalized 6-touchpoint email sequences for Makeshapes, a digital learning platform that enables group learning at scale without facilitators.

## Company Context: Makeshapes

### Core Value Proposition
Makeshapes is a digital learning platform that solves the enterprise training trade-off: achieving both scale AND impact. Traditional facilitated training is impactful but expensive and slow. E-learning is scalable but lacks engagement. Makeshapes delivers the best of both worlds through on-demand group learning experiences.

### Key Differentiators
- Group learning without facilitators: Enable discussion-rich experiences at unlimited scale
- Consistent delivery: Same high-quality experience whether 10 or 10,000 participants
- Flexible deployment: Works in-person, remote, or hybrid environments
- Rapid rollout: Deploy to entire organizations in days, not months
- Cost-effective: Reduce training costs from $45 to $12 per hour
- High engagement: Achieve 80%+ participation rates (vs 20-30% for e-learning)

### Proven Results & Case Studies
**Zespri Case Study:**
- Reached 700 participants across 25 countries in 5 days
- 80% participation rate for mental health training
- Delivered in multiple languages with local subtitles
- Achieved consistent experience across all demographics

**International Mining Company:**
- Trained 2,500 leaders globally in 5 languages
- 87% participation rate
- 20% improvement in health literacy
- 18% increase in mental health conversations
- 16% rise in support interventions

**Generic Metrics:**
- 47% reduction in training time
- 6x more actions taken vs traditional workshops
- $2.4M annual savings for 3,000-person rollouts
- Time-to-productivity reduced from 12 to 6 weeks

## Target Buyer Profile
- Companies: 2,500-10,000+ employees, complex/dispersed operations
- Industries: Financial Services, Insurance, Telecommunications, Healthcare, Technology, Mining
- Personas: VP/Director/Head of L&D, HR, Talent, Transformation, or functional leaders with training needs
- Trigger Events: Mergers, expansion, digital transformation, new leadership, regulatory changes

## PROSPECT DETAILS:
- Name: ${getFieldValue('contact') || 'N/A'}
- Company: ${getFieldValue('company') || 'N/A'}
- Title: ${getFieldValue('title') || 'N/A'}
- Email: ${getFieldValue('email') || 'N/A'}
- Industry: ${getFieldValue('industry') || 'Technology'}
- LinkedIn: ${getFieldValue('linkedin') || 'N/A'}

## Email Sequence Structure & Requirements

### Touchpoint Schedule
- Day 1: Initial cold email (problem recognition)
- Day 2-3: LinkedIn connection request
- Day 5: Email bump (reply to original)
- Day 9-10: Follow-up email (new angle - Shapeshifters podcast/panel)
- Day 13: Email bump to follow-up
- Day 20: Final breakup email

Generate exactly 7 content snippets:
1. **snippet1**: Day 1 Email SUBJECT LINE (36-50 characters, format: [Company Name]'s [specific challenge/opportunity])
2. **snippet2**: Day 1 Email BODY (HTML with <div> tags, 150-200 words)
3. **snippet3**: Day 2-3 LinkedIn message (plain text, under 300 characters)
4. **snippet4**: Day 5 Bump email (HTML formatted, short: "Any thoughts, [Name]? Best, Dan")
5. **snippet5**: Day 9-10 Follow-up email (HTML, 150-200 words, mention Shapeshifters panel)
6. **snippet6**: Day 13 Bump email (HTML, mention panel discussion and demo link)
7. **snippet7**: Day 20 Breakup email (HTML, 150-200 words, graceful exit)

### Writing Rules

**Subject Line Requirements:**
- Length: 36-50 characters maximum
- Format: [Company Name]'s [specific challenge/opportunity]
- NO questions, exclamation points, or generic phrases

**Email Structure (150-200 words):**
- Opening Hook (25 words): Reference specific trigger/recent news
- Peer Proof (75 words): Similar company example with metrics
- Their ROI (50 words): Quantify potential impact for them
- Soft CTA (25 words): Exploratory question, not meeting request

**Proven Opening Patterns:**
1. "I noticed the incredible work you're doing with [program]. Curious how you're approaching [specific element]?"
2. "I've been hearing from leaders in [industry] that [challenge] is a top priority..."
3. "I noticed [specific context]. It got me wondering how you're handling [challenge] at [company]..."
4. "Given your experience with [initiative], I'd be curious to get your feedback on [new approach]..."

### Language Requirements

**NEVER Use (Spam Triggers):**
- Financial: free, discount, save money, cheap, guarantee
- Urgency: urgent, limited time, act now, deadline
- Hype: amazing, revolutionary, breakthrough, game-changing
- Aggressive: buy now, sign up, click here

**ALWAYS Use Instead:**
- "Explore" not "Buy"
- "Worth considering" not "Act now"
- "Measurable improvement" not "Amazing results"
- "Investment" not "Price/Cost"

### Personalization Requirements
Each email MUST include:
- Exact company name (as officially used)
- Specific trigger event or context
- Employee count or scale reference
- Industry-relevant metric
- Peer company example (named or "Fortune 500 [industry] firm")
- 2-3 quantified results

## OUTPUT FORMAT
Generate exactly 7 text blocks separated by "---BLOCK---" delimiter:

Block 1: Subject line only (36-50 characters)
Block 2: Day 1 Email body (plain text, 150-200 words - will be converted to HTML)
Block 3: LinkedIn Message (under 300 characters)
Block 4: Day 5 Bump ("Any thoughts, [Name]? Best, Dan")
Block 5: Day 9-10 Follow-up (plain text, 150-200 words, mention Shapeshifters panel)
Block 6: Day 13 Bump (mention panel discussion and demo link)
Block 7: Day 20 Breakup (plain text, 150-200 words, graceful exit)

IMPORTANT: 
- Start output with "---BLOCK---" before Block 1
- Separate each block with "---BLOCK---"
- Write email bodies in plain text with paragraph breaks (double newline)
- Do NOT include HTML tags - they will be added automatically
- Do NOT include block numbers or labels in the output

Example Input → Output
Input: "John Smith, VP L&D at Ally Financial (8,000 employees), expanding digital banking with 2,000 new hires, posted about 'scaling L&D without losing quality'"
Output Block 1:
Ally's 2,000 new hire onboarding challenge
Output Block 2:
Hi John,
I noticed Ally's announcement about hiring 2,000 new digital banking employees.
Wells Fargo faced similar onboarding scale challenges when they expanded their digital team. Using group learning without facilitators, they reduced time-to-productivity from 12 weeks to 6 weeks while maintaining consistency across all locations. Their training costs dropped from $45 to $12 per hour—saving $2.4M annually on their 3,000-person rollout.
For Ally's expansion, this approach could onboard your 2,000 new hires 47% faster while ensuring consistent capability building across all roles. Based on typical financial services training costs, you'd see approximately $1.5M in savings.
Worth exploring how this could accelerate your digital banking transformation?
Best,
Dan
[Continue with remaining blocks following the format above]`

    setSystemPrompt(defaultSystemPrompt)
    setEditedSystemPrompt(defaultSystemPrompt)

    // Set default custom prompt
    const leadName = getFieldValue('contact') || 'this lead'
    setCustomPrompt(`Tell me about ${leadName}`)
  }, [lead.email, lead.id, getFieldValue])

  const generateContent = async () => {
    if (!lead.email || !lead.company) {
      setError(
        'Lead must have email and company information to generate content'
      )
      return
    }

    setIsGenerating(true)
    setError(null)
    setIsModalOpen(false)

    try {
      const leadData = {
        first_name:
          ((lead as any).contact || getFieldValue('contact'))?.split(' ')[0] ||
          'There',
        last_name:
          ((lead as any).contact || getFieldValue('contact'))
            ?.split(' ')
            .slice(1)
            .join(' ') || '',
        company: (lead as any).company || getFieldValue('company') || '',
        title: (lead as any).title || getFieldValue('title') || '',
        email: (lead as any).email || getFieldValue('email') || '',
        industry:
          (lead as any).industry || getFieldValue('industry') || 'Technology',
        linkedin_url: (lead as any).linkedin || getFieldValue('linkedin') || '',
      }

      const result = await contentGenerationService.generateForLead(leadData)

      if (result.status === 'completed' && result.content) {
        setContent(result.content)
        onContentUpdate?.(result.content)
        onStatusUpdate?.(lead.id, 'drafted')
      } else {
        setError(result.error || 'Failed to generate content')
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleOpenModal = () => {
    const leadName = getFieldValue('contact') || 'this lead'
    setCustomPrompt(`Tell me about ${leadName}`)
    setIsModalOpen(true)
  }

  // Shared modal content
  const renderGenerationModal = () => (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Email Sequence</DialogTitle>
          <DialogDescription>
            Customize your prompt and system settings for personalized content
            generation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Custom Prompt Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Prompt</label>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Enter your custom prompt here..."
              rows={4}
              className="min-h-[100px]"
            />
          </div>

          {/* System Prompt Accordion */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="system-prompt">
              <AccordionTrigger className="text-sm font-medium">
                System Prompt Settings
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Configure the system prompt that guides content generation
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setIsEditingSystemPrompt(!isEditingSystemPrompt)
                      }
                    >
                      {isEditingSystemPrompt ? 'Cancel' : 'Edit'}
                    </Button>
                  </div>

                  {isEditingSystemPrompt ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editedSystemPrompt}
                        onChange={(e) => setEditedSystemPrompt(e.target.value)}
                        rows={12}
                        className="min-h-[300px] font-mono text-xs"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveSystemPrompt}>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelSystemPromptEdit}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted/50 rounded-lg p-4">
                      <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground max-h-[200px] overflow-y-auto">
                        {systemPrompt}
                      </pre>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              generateContent()
              setIsModalOpen(false)
            }}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  const handleSaveSystemPrompt = () => {
    setSystemPrompt(editedSystemPrompt)
    setIsEditingSystemPrompt(false)
  }

  const handleCancelSystemPromptEdit = () => {
    setEditedSystemPrompt(systemPrompt)
    setIsEditingSystemPrompt(false)
  }

  // Convert plain text to HTML format
  const convertTextToHtml = (text: string): string => {
    return text
      .split('\n\n')
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0)
      .map((paragraph) => `<div>${paragraph}</div>`)
      .join('<div><br></div>')
  }

  // Extract plain text from HTML
  const convertHtmlToText = (html: string): string => {
    return html
      .replace(/<div><br><\/div>/g, '\n\n')
      .replace(/<div>/g, '')
      .replace(/<\/div>/g, '')
      .replace(/<br>/g, '\n')
      .trim()
  }

  const startPreviewEdit = (snippetKey: string) => {
    setEditingPreview(snippetKey)
    const htmlContent = content?.[snippetKey as keyof ClaudeResponse] || ''
    const textContent = convertHtmlToText(String(htmlContent))
    setPreviewContent({
      ...previewContent,
      [snippetKey]: textContent,
    })
  }

  const savePreviewEdit = (snippetKey: string) => {
    if (!content) return

    const textContent = previewContent[snippetKey as keyof ClaudeResponse] || ''
    const htmlContent = convertTextToHtml(String(textContent))

    const updatedContent = {
      ...content,
      [snippetKey]: htmlContent,
    }

    setContent(updatedContent)
    onContentUpdate?.(updatedContent)

    // Update localStorage
    const leadId = btoa(String(lead.email || lead.id)).replace(/[/+=]/g, '')
    const data = {
      ...updatedContent,
      generatedAt: new Date().toISOString(),
    }
    localStorage.setItem(`lead_content_${leadId}`, JSON.stringify(data))

    setEditingPreview(null)
    setPreviewContent({})
  }

  const cancelPreviewEdit = () => {
    setEditingPreview(null)
    setPreviewContent({})
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
    onContentUpdate?.(updatedContent)

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
    } catch {
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
                    onClick={() =>
                      snippet.isHtml
                        ? startPreviewEdit(String(snippet.key))
                        : startEditing(String(snippet.key))
                    }
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </>
              )}
              {(isEditing || editingPreview === snippet.key) && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      editingPreview === snippet.key
                        ? savePreviewEdit(String(snippet.key))
                        : saveEdit(String(snippet.key))
                    }
                    className="h-8 w-8 p-0"
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={
                      editingPreview === snippet.key
                        ? cancelPreviewEdit
                        : cancelEdit
                    }
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
          ) : editingPreview === snippet.key ? (
            <div className="space-y-2">
              <Textarea
                value={String(previewContent[snippet.key] || '')}
                onChange={(e) =>
                  setPreviewContent({
                    ...previewContent,
                    [snippet.key]: e.target.value,
                  })
                }
                rows={6}
                className="min-h-[80px] text-sm"
                placeholder="Edit the preview text here..."
              />
            </div>
          ) : (
            <div className="space-y-2">
              {snippet.isHtml ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-muted-foreground">
                        Preview:
                      </div>
                      {editingPreview !== snippet.key && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startPreviewEdit(String(snippet.key))}
                          className="h-6 px-2 text-xs"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit Preview
                        </Button>
                      )}
                    </div>
                    {editingPreview === snippet.key ? (
                      <div className="space-y-2">
                        <Textarea
                          value={String(previewContent[snippet.key] || '')}
                          onChange={(e) =>
                            setPreviewContent({
                              ...previewContent,
                              [snippet.key]: e.target.value,
                            })
                          }
                          rows={6}
                          className="min-h-[80px] text-sm"
                          placeholder="Edit the preview text here..."
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => savePreviewEdit(String(snippet.key))}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save & Convert to HTML
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelPreviewEdit}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="text-sm border rounded p-3 bg-muted/20 min-h-[80px] cursor-pointer hover:bg-muted/30 transition-colors"
                        dangerouslySetInnerHTML={{
                          __html: String(displayContent),
                        }}
                        onClick={() => startPreviewEdit(String(snippet.key))}
                        title="Click to edit preview"
                      />
                    )}
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

  // Debug: Let's see what fields are actually available (commented out to prevent re-render loops)
  // console.log('ContentGeneration: All lead fields', {
  //   leadKeys: Object.keys(lead),
  //   email: (lead as any).email,
  //   company: (lead as any).company,
  //   contact: (lead as any).contact,
  //   title: (lead as any).title,
  //   department: (lead as any).department,
  //   leadValues: lead,
  // })

  // For now, show the component regardless of field validation to test the modal
  // const hasRequiredFields = true

  return (
    <>
      {renderGenerationModal()}
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
              <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Generate Email Sequence
              </h3>
              <p className="text-muted-foreground mb-4">
                Create a personalized 6-touchpoint email sequence for{' '}
                {getFieldValue('contact') || 'this lead'}
                {getFieldValue('company') && ` at ${getFieldValue('company')}`}
              </p>
              <Button onClick={handleOpenModal} className="gap-2">
                <WandSparkles className="h-4 w-4" />
                Generate Content
              </Button>
            </div>
          )}

          {isGenerating && (
            <div className="text-center py-6">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Generating Content...
              </h3>
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
                  onClick={handleOpenModal}
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
    </>
  )
}
