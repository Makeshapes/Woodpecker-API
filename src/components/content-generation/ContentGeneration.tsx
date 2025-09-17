import { useState, useEffect, useCallback, useMemo } from 'react'
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
// Dialog components removed - using inline interface instead
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Loader2,
  Sparkles,
  Edit,
  Save,
  X,
  Copy,
  Coins,
  Hash,
  Upload,
  FileText,
  Image,
  Trash2,
} from 'lucide-react'
import {
  contentGenerationService,
  type GenerationMode,
} from '@/services/contentGenerationService'
import type { LeadData, ColumnMapping } from '@/types/lead'
import type { ClaudeResponse } from '@/services/claudeService'
import { createClaudeService } from '@/services/claudeService'
import {
  estimateTokens,
  MODEL_PRICING,
  calculatePrice,
  formatPrice,
} from '@/utils/tokenCounter'
import type { FileAttachment } from '@/utils/fileHandler'
import { processFile, formatFileSize } from '@/utils/fileHandler'
import {
  type PlainTextContent,
  convertFromHtmlContent,
} from '@/utils/contentConverter'
import PlainTextEditor from './PlainTextEditor'

interface ContentGenerationProps {
  lead: LeadData
  columnMapping?: ColumnMapping
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
  columnMapping,
  onStatusUpdate,
  onContentUpdate,
}: ContentGenerationProps) {
  // Feature flag for enhanced editing (Story 1.5)
  const useEnhancedEditing =
    import.meta.env.VITE_ENABLE_ENHANCED_EDITING === 'true'

  const [isGenerating, setIsGenerating] = useState(false)
  const [content, setContent] = useState<ClaudeResponse | null>(null)
  const [editingSnippet, setEditingSnippet] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState<Partial<ClaudeResponse>>(
    {}
  )
  // const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview')
  const [error, setError] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [isEditingSystemPrompt, setIsEditingSystemPrompt] = useState(false)
  const [editedSystemPrompt, setEditedSystemPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-20250514')
  const [fileAttachments, setFileAttachments] = useState<FileAttachment[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [generationMode, setGenerationMode] = useState<GenerationMode>('claude')

  // Enhanced editing state (Story 1.5)
  const [editingMode, setEditingMode] = useState<'html' | 'plaintext'>(
    'plaintext'
  )
  const [plainTextContent, setPlainTextContent] = useState<PlainTextContent>({
    snippet1: '',
    snippet2: '',
    snippet3: '',
    snippet4: '',
    snippet5: '',
    snippet6: '',
    snippet7: '',
  })
  const [editingPlainTextField, setEditingPlainTextField] = useState<
    string | null
  >(null)
  const [showJsonOutput, setShowJsonOutput] = useState(false)

  // Calculate token counts and pricing
  const tokenInfo = useMemo(() => {
    // Count system and user prompts separately (system prompts are more efficient)
    const systemTokens = estimateTokens(systemPrompt)
    const userTokens = estimateTokens(customPrompt)

    // Add tokens for file attachments - much lower with Files API
    let attachmentTokens = 0
    if (fileAttachments.length > 0) {
      fileAttachments.forEach((file) => {
        if (file.file_id) {
          // With Files API, we only pay for file references, not the full content
          if (file.type.startsWith('image/')) {
            // Files API charges for image analysis, estimated ~10-50 tokens per image
            attachmentTokens += 20
          } else if (file.type === 'application/pdf') {
            // PDF analysis through Files API, estimated ~50-200 tokens depending on content
            const sizeInKB = file.size / 1024
            attachmentTokens += Math.min(Math.ceil(sizeInKB / 20), 200) // Max 200 tokens per PDF
          }
        } else if (!file.uploading) {
          // File upload failed, but still show old base64 estimates to warn user
          if (file.type.startsWith('image/')) {
            const sizeInKB = file.size / 1024
            if (sizeInKB < 100) {
              attachmentTokens += 750
            } else if (sizeInKB < 500) {
              attachmentTokens += 1500
            } else {
              attachmentTokens += 3000
            }
          } else if (file.type === 'application/pdf') {
            attachmentTokens += Math.ceil((file.size / 1024 / 100) * 500)
          }
        }
        // Files that are uploading don't count towards tokens yet
      })
    }

    // Total input tokens (system prompt is handled more efficiently by Claude)
    const inputTokens = systemTokens + userTokens + attachmentTokens
    // Estimate output tokens (7 blocks, roughly 1000 tokens total)
    const estimatedOutputTokens = 1000
    const pricing = calculatePrice(
      inputTokens,
      estimatedOutputTokens,
      selectedModel
    )

    return {
      inputTokens,
      estimatedOutputTokens,
      totalTokens: inputTokens + estimatedOutputTokens,
      pricing,
      modelInfo: MODEL_PRICING[selectedModel],
      attachmentTokens,
      systemTokens,
      userTokens,
    }
  }, [systemPrompt, customPrompt, selectedModel, fileAttachments])

  const getFieldValue = useCallback(
    (field: string): string => {
      // If we have columnMapping, use it to find the actual field name
      if (columnMapping) {
        // Find the original field name that maps to the desired standard field
        const originalFieldName = Object.keys(columnMapping).find(
          (key) => columnMapping[key] === field
        )

        if (originalFieldName) {
          const value = (lead as Record<string, unknown>)[originalFieldName]
          if (value) return String(value)
        }
      }

      // Fallback: Try to get the value directly from lead data
      const directValue = (lead as Record<string, unknown>)[field]
      if (directValue) return String(directValue)

      // Final fallback: Try common field name variations
      const variations = {
        company: ['company_name', 'organization', 'company'],
        first_name: ['first_name', 'fname', 'firstname'],
        last_name: ['last_name', 'lname', 'lastname'],
        email: ['email_address', 'email'],
        title: ['job_title', 'position', 'title'],
        industry: ['industry', 'sector', 'vertical'],
        linkedin_url: ['linkedin_url', 'linkedin_profile', 'linkedin'],
        website: ['website', 'company_website', 'url', 'web_url'],
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
    [lead, columnMapping]
  )

  // Load existing content when lead changes
  useEffect(() => {
    const loadExistingContent = async () => {
      console.log(
        '🔄 [ContentGeneration] Lead changed, loading content for:',
        lead.email || lead.id
      )
      const dbLeadId = String(lead.id)
      const existingContent =
        await contentGenerationService.getLeadContent(dbLeadId)

      console.log(
        '🔄 [ContentGeneration] Found existing content:',
        !!existingContent
      )

      if (existingContent) {
        setContent(existingContent)
        onContentUpdate?.(existingContent)
        // Update status to 'drafted' if content exists but lead status is still 'imported'
        if (lead.status === 'imported') {
          console.log(
            '🔄 [ContentGeneration] Updating status from imported to drafted for lead with existing content:',
            lead.id
          )
          onStatusUpdate?.(lead.id, 'drafted')
        }
      }
    }

    loadExistingContent()
  }, [lead.email, lead.id, lead.status, onContentUpdate, onStatusUpdate])

  // Convert HTML to plain text when enhanced editing is enabled and we have content but no plain text
  useEffect(() => {
    if (
      useEnhancedEditing &&
      content &&
      !plainTextContent.snippet1 &&
      !plainTextContent.snippet2
    ) {
      console.log(
        '🔄 [ContentGeneration] Converting HTML to plain text for enhanced editing'
      )
      const plainText = convertFromHtmlContent(content)
      setPlainTextContent(plainText)
      setEditingMode('plaintext')
      setShowJsonOutput(false)
    }
  }, [
    useEnhancedEditing,
    content,
    plainTextContent.snippet1,
    plainTextContent.snippet2,
  ])

  // Initialize system prompt
  useEffect(() => {
    // Set default system prompt
    const defaultSystemPrompt = `# Makeshapes Cold Email Sequence Generator - System Prompt

## PRIORITY INSTRUCTION
If the user provides any context or information in their prompt, ALWAYS prioritize and use that information above any generic templates or assumptions. The user's input contains critical personalization details that must be incorporated into the email sequence.

## Your Role
You are an expert B2B sales copywriter specializing in enterprise Learning & Development solutions. You generate personalized 6-touchpoint email sequences for Makeshapes, a digital learning platform that enables group learning at scale without facilitators.

## Company Context: Makeshapes

### What We Sell: On-Demand Group Learning Platform
Makeshapes is a digital platform that enables large organizations to deliver discussion-rich group learning experiences at scale WITHOUT facilitators. We solve the "training trade-off" - organizations no longer have to choose between impactful-but-expensive facilitated training OR scalable-but-boring e-learning.

### The Problem We Solve
- **The Training Trade-off**: Organizations are forced to choose between:
  - High-impact facilitated training (expensive, slow, limited reach)
  - Scalable e-learning (boring, low engagement, poor retention)
- **Magical Dissemination Theory**: Training only senior leaders and hoping knowledge "trickles down" (it doesn't)
- **Hybrid Work Challenges**: Remote/hybrid teams can't access traditional in-person group learning
- **Inconsistent Delivery**: Train-the-trainer approaches lead to variable quality and messaging

### Our Unique Solution: Auto-Facilitated Group Learning
- **Platform auto-facilitates** every session - no expert facilitator needed
- **Leader-led delivery**: Empower any manager to host impactful learning with zero prep
- **Microlearning for teams**: 15-minute group sessions instead of all-day workshops
- **Everyone-to-everyone learning**: Roll out to entire organization simultaneously
- **Real-time insights**: Track participation, capture feedback, measure outcomes

### Key Differentiators
- **Group learning without facilitators**: Discussion-rich experiences at unlimited scale
- **Consistent delivery**: Same high-quality experience for 10 or 10,000 participants
- **Hybrid-friendly**: Works equally well for in-person, remote, or mixed groups
- **Rapid deployment**: Roll out to entire organizations in days, not months
- **Cost transformation**: Reduce training costs from $45 to $12 per hour
- **Engagement breakthrough**: Achieve 80%+ participation (vs 20-30% for e-learning)
- **Psychological safety**: Anonymous responses, aggregated results, break options

### Proven Results & Case Studies

**Zespri International (Global Kiwifruit Company):**
- Delivered mental health "circuit breaker" to 700 employees across 25 countries in just 5 DAYS
- 80% participation rate (vs typical 20-30% for e-learning)
- Multiple languages with local subtitles
- Quote: "Without Makeshapes the learning wouldn't have had the impact that it did. The platform is seamless."

**Global Mining Company:**
- Trained 2,500 leaders across 5 languages simultaneously
- 87% participation rate
- 20% improvement in health literacy scores
- 18% increase in mental health conversations
- 16% rise in support interventions

**Wells Fargo (Financial Services):**
- Reduced onboarding time from 12 weeks to 6 weeks (50% reduction)
- Cut training costs by 73% (from $45 to $12 per hour)
- $2.4M annual savings on 3,000-person digital team expansion
- Maintained consistency across all locations

**Starbucks Reference:**
- When Starbucks shut 8,000 stores for diversity training, they used group learning at scale
- Shows the power of everyone-to-everyone learning (but at huge cost - $12M in lost profit alone)
- Makeshapes enables this same approach WITHOUT shutting down operations

**Typical Results:**
- 47% reduction in time-to-productivity
- 6x more behavior change vs traditional workshops
- 80%+ participation rates (vs 20-30% for e-learning)
- Deploy to thousands in days (vs months/years for traditional)

## Target Buyer Profile

### Company Characteristics:
- **Size**: 2,500-10,000+ employees (enterprise scale)
- **Structure**: Complex, dispersed, multi-location operations
- **Work Model**: Hybrid, remote, or mixed workforce
- **Challenge**: Need to train large populations quickly and consistently

### Industries We Excel In:
- **Financial Services**: Banks, insurance (compliance, digital transformation, onboarding)
- **Technology**: Software, SaaS companies (rapid scaling, continuous learning)
- **Healthcare**: Hospitals, health systems (safety training, protocol rollouts)
- **Mining/Manufacturing**: Global operations (safety, leadership development)
- **Telecommunications**: Dispersed workforce (customer service, technical training)

### Key Buyer Personas:
- **VP/Director of L&D**: Struggling with scale vs impact trade-off
- **Head of HR/People**: Need culture change at scale
- **Transformation Leaders**: Rolling out new ways of working
- **Safety/Compliance Officers**: Ensure consistent training delivery
- **Functional Leaders**: Department heads with specific training needs

### Trigger Events & Pain Points:
- **M&A Integration**: Need to align cultures and processes quickly
- **Rapid Expansion**: Onboarding thousands of new hires
- **Digital Transformation**: Reskilling entire workforce
- **Regulatory Changes**: Compliance training at scale
- **Culture Initiatives**: DEI, wellbeing, leadership development
- **Hybrid Work Transition**: Training dispersed teams
- **Budget Pressure**: Do more with less, reduce training costs

## Platform Features That Matter to Buyers:
- **1-Click Access**: No apps, downloads, or complex IT integration
- **Enterprise Security**: AES-256 encryption, GDPR/CCPA compliant
- **Real-time Analytics**: Track participation, measure outcomes, gather insights
- **Drag-and-drop Authoring**: Create experiences without technical skills
- **Interactive Elements**: Polls, voting, card sorts, breakouts
- **Background Music**: Sets tone and energy for sessions
- **Multi-language Support**: Global rollout capability
- **LMS Integration**: Works with existing L&D ecosystem

## How Makeshapes Changes the Game:
1. **From Months to Days**: Deploy training to thousands in 5 days vs 6+ months
2. **From $45 to $12/hour**: 73% reduction in training costs
3. **From 20% to 80% participation**: 4x improvement in engagement
4. **From Inconsistent to Uniform**: Every group gets the same quality experience
5. **From Top-down to Everyone**: No more "magical dissemination" hoping knowledge trickles down

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

## Processing Instructions

1. **FIRST - Check for user-provided context:**
   - Any specific information about the prospect
   - Recent news, posts, or activities mentioned
   - Specific challenges or initiatives
   - Personal details or connections
   - USE THIS INFORMATION AS THE PRIMARY BASIS FOR PERSONALIZATION

2. **Analyze the input for:**
   - Company specifics (size, industry, initiatives)
   - Personal details (role, interests, recent activity)
   - Trigger events or timely opportunities
   - Relevant pain points

2. **Select the most relevant:**
   - Makeshapes case study or metrics
   - Peer company comparison
   - Value propositions (2-3 per email)
   - Opening pattern for Day 1

3. **Calculate specific ROI using:**
   - Their employee/scale numbers
   - Industry training benchmarks ($1,200/employee average)
   - Makeshapes metrics (47% time reduction, 80% participation, etc.)

4. **Maintain progression:**
   - Day 1: Problem recognition
   - Day 9-10: New opportunity (panel/podcast)
   - Day 20: Graceful exit

5. **Quality check:**
   - No spam trigger words
   - Specific personalization in each touchpoint
   - Metrics and peer examples included
   - Professional but conversational tone

## CRITICAL OUTPUT FORMAT REQUIREMENTS - FOLLOW EXACTLY

🚨 **MANDATORY RULES - NO EXCEPTIONS:**

1. **START YOUR RESPONSE IMMEDIATELY WITH ---BLOCK---**
2. **NO EXPLANATIONS, NO APOLOGIES, NO INTRODUCTIONS**
3. **NO JSON FORMAT EVER**
4. **EXACTLY 7 BLOCKS SEPARATED BY ---BLOCK---**
5. **NO FIELD NAMES OR LABELS**

**DO NOT OUTPUT JSON!** Output plain text blocks ONLY.

You MUST output exactly 7 text blocks separated by "---BLOCK---" delimiter.
DO NOT output JSON format. DO NOT include field names like "snippet1" or "email".
Just output the raw content blocks separated by ---BLOCK---

**YOUR RESPONSE MUST START WITH:** ---BLOCK---

**Block 1:** Subject line only (36-50 characters)

**Block 2:** Day 1 Email
- Open with trigger event/context
- Include peer company success story
- Quantify their potential ROI
- End with exploratory question

**Block 3:** LinkedIn Message (under 300 characters)
"Hey [Name], I noticed [specific context] and was hoping to connect. [Brief value mention]. Best—Dan"

**Block 4:** Day 5 Bump
"Any thoughts, [Name]?

Best,
Dan"

**Block 5:** Day 9-10 Follow-up
- Start: "A quick follow-up thought here..."
- Mention Shapeshifters podcast and panel discussions
- Different angle from Day 1
- Invite to panel discussion

**Block 6:** Day 13 Bump
"Hi [Name], Just a friendly bump here. If the panel discussion interests you, I can connect you with Mike who's coordinating it.

P.S. If you're curious about our approach, here's a demo experience: [link]

Best,
Dan"

**Block 7:** Day 20 Breakup
- Start: "Just wanted to float this to the top of your inbox one last time..."
- Acknowledge timing may not be right
- Leave door open for future
- Professional and understanding tone

## CRITICAL OUTPUT RULES - MUST FOLLOW:

🚨 **FINAL REMINDER - ABSOLUTELY MANDATORY:**

- **YOUR FIRST WORD MUST BE: ---BLOCK---**
- **NO EXPLANATORY TEXT BEFORE THE BLOCKS**
- **NO APOLOGIES OR CONTEXT**
- **DO NOT OUTPUT JSON FORMAT**
- Start your response with "---BLOCK---" immediately
- Output ONLY the content, no field names or JSON structure
- Separate each block with "---BLOCK---" on its own line
- Write email bodies in plain text with paragraph breaks (double newline)
- Do NOT include HTML tags - they will be added automatically
- Do NOT include block numbers, labels, or field names in the output
- Do NOT wrap the output in JSON or any other format

**EXAMPLE START OF CORRECT RESPONSE:**
---BLOCK---
Your first subject line here
---BLOCK---
Your first email content here...

## Example Input → Output

**Input:** "John Smith, VP L&D at Ally Financial (8,000 employees), expanding digital banking with 2,000 new hires, posted about 'scaling L&D without losing quality'"

**CORRECT Output Format (NOT JSON, just plain text blocks):**
---BLOCK---
Ally's 2,000 new hire onboarding challenge
---BLOCK---
Hi John,

I noticed Ally's announcement about hiring 2,000 new digital banking employees.

Wells Fargo faced similar onboarding scale challenges when they expanded their digital team. Using group learning without facilitators, they reduced time-to-productivity from 12 weeks to 6 weeks while maintaining consistency across all locations. Their training costs dropped from $45 to $12 per hour—saving $2.4M annually on their 3,000-person rollout.

For Ally's expansion, this approach could onboard your 2,000 new hires 47% faster while ensuring consistent capability building across all roles. Based on typical financial services training costs, you'd see approximately $1.5M in savings.

Worth exploring how this could accelerate your digital banking transformation?

Best,
Dan
---BLOCK---
Hey John, I noticed Ally's hiring 2,000 for digital banking expansion. We helped Wells Fargo reduce onboarding by 47% using group learning at scale. Worth connecting? Best—Dan
---BLOCK---
Any thoughts, John?

Best,
Dan
---BLOCK---
A quick follow-up thought here...

I've been hosting panel discussions with L&D leaders from major financial institutions through our Shapeshifters podcast. They're sharing how they're tackling scale challenges like yours at Ally.

Next week's panel features leaders from JPMorgan and Citi discussing "Scaling Digital Banking Training Without Losing Quality" - exactly what you mentioned in your recent post.

Would you be interested in joining as a guest? It's a small group, off-the-record discussion where you can learn from peers facing similar challenges.

Best,
Dan
---BLOCK---
Hi John, Just a friendly bump here. If the panel discussion interests you, I can connect you with Mike who's coordinating it.

P.S. If you're curious about our approach, here's a demo experience: makeshapes.com/demo

Best,
Dan
---BLOCK---
Just wanted to float this to the top of your inbox one last time...

I realize the timing might not be right with everything on your plate at Ally. Scaling from 6,000 to 8,000 employees while maintaining quality training is no small feat.

If things change or you'd like to explore how other financial institutions have tackled similar challenges, I'm here. In the meantime, I'll keep sharing relevant insights from our work with Wells Fargo and JPMorgan.

Wishing you success with the expansion.

Best,
Dan`

    setSystemPrompt(defaultSystemPrompt)
    setEditedSystemPrompt(defaultSystemPrompt)
  }, [getFieldValue])

  const generateContent = async () => {
    if (!lead.email || !lead.company) {
      setError(
        'Lead must have email and company information to generate content'
      )
      return
    }

    // Check if any files are still uploading
    const uploadingFiles = fileAttachments.filter((f) => f.uploading)
    if (uploadingFiles.length > 0) {
      setError(
        `Please wait for ${uploadingFiles.length} file(s) to finish uploading before generating content`
      )
      return
    }

    setIsGenerating(true)
    setError(null)

    // Debug: Log when generation starts
    console.log('🚀 Starting content generation for lead:', lead.email)
    console.log('📝 Custom prompt:', customPrompt)
    console.log('🤖 Selected model:', selectedModel)

    try {
      // Build prompt with file references or base64 data as fallback
      let userPrompt = customPrompt
      const fileIds: string[] = []

      if (fileAttachments.length > 0) {
        userPrompt += '\n\n--- ATTACHED FILES ---\n'
        fileAttachments.forEach((file, index) => {
          if (file.file_id) {
            // Use Files API reference
            fileIds.push(file.file_id)
            if (file.type.startsWith('image/')) {
              userPrompt += `\n[Image ${index + 1}: ${file.name}]\n`
            } else if (file.type === 'application/pdf') {
              userPrompt += `\n[PDF ${index + 1}: ${file.name}]\n`
            }
          } else if (!file.uploading) {
            // Fallback to base64 embedding
            if (file.type.startsWith('image/')) {
              userPrompt += `\n[Image ${index + 1}: ${file.name}]\n`
              userPrompt += file.data + '\n'
            } else if (file.type === 'application/pdf') {
              userPrompt += `\n[PDF ${index + 1}: ${file.name} - Note: PDF content needs to be extracted separately]\n`
            }
          }
        })
      }

      // Create full prompt with system prompt for processing
      const fullPromptWithSystem = `${systemPrompt}\n\n${userPrompt}`

      const leadRecord = lead as Record<string, unknown>
      const leadData = {
        first_name:
          leadRecord.first_name?.toString() ||
          getFieldValue('first_name') ||
          'There',
        last_name:
          leadRecord.last_name?.toString() ||
          getFieldValue('last_name') ||
          '',
        company:
          leadRecord.company?.toString() || getFieldValue('company') || '',
        title: leadRecord.title?.toString() || getFieldValue('title') || '',
        email: leadRecord.email?.toString() || getFieldValue('email') || '',
        phone: leadRecord.phone?.toString() || getFieldValue('phone') || '',
        website: leadRecord.website?.toString() || getFieldValue('website') || '',
        linkedin_url:
          leadRecord.linkedin_url?.toString() ||
          getFieldValue('linkedin_url') ||
          '',
        address: leadRecord.address?.toString() || getFieldValue('address') || '',
        city: leadRecord.city?.toString() || getFieldValue('city') || '',
        state: leadRecord.state?.toString() || getFieldValue('state') || '',
        country: leadRecord.country?.toString() || getFieldValue('country') || '',
        industry:
          leadRecord.industry?.toString() ||
          getFieldValue('industry') ||
          'Technology',
        tags: leadRecord.tags?.toString() || getFieldValue('tags') || '',
        custom_prompt: fullPromptWithSystem, // Include the full prompt with system prompt for processing
        file_ids: fileIds, // Include file IDs for Files API
      }

      // Debug: Log the lead data being sent
      console.log('📊 Lead data being sent to Claude:', leadData)

      // Update status to show generating even if component unmounts
      console.log(
        '🔄 Updating lead status to "generating" for lead ID:',
        lead.id
      )
      onStatusUpdate?.(lead.id, 'generating')

      // Set the generation mode in the service
      contentGenerationService.setGenerationMode(generationMode)

      console.log(
        '⏳ Calling content generation service with mode:',
        generationMode
      )
      const result = await contentGenerationService.generateForLead(
        leadData,
        'email-sequence',
        selectedModel,
        parseInt(String(lead.id))
      )

      // Debug: Log the raw result from Claude
      console.log('📥 Raw result from Claude:', result)

      if (result.status === 'completed' && result.content) {
        console.log('✅ Content generation successful!')
        console.log('📄 Generated content:', result.content)

        setContent(result.content)
        onContentUpdate?.(result.content)

        // Enhanced editing: Convert HTML content to plain text for editing (Story 1.5)
        if (useEnhancedEditing) {
          console.log(
            '🔄 [Enhanced Editing] Converting HTML content to plain text...'
          )
          const plainText = convertFromHtmlContent(result.content)
          setPlainTextContent(plainText)
          setEditingMode('plaintext')
          setShowJsonOutput(false)
          console.log(
            '✅ [Enhanced Editing] Content converted to plain text for editing'
          )
        }

        console.log(
          '✅ Updating lead status to "drafted" for lead ID:',
          lead.id
        )
        onStatusUpdate?.(lead.id, 'drafted')

        // Save to localStorage for persistence
        const leadId = String(lead.id)
        console.log(
          '💾 Saving to localStorage with key:',
          `lead_content_${leadId}`
        )
      } else {
        console.error('❌ Generation failed:', result.error)
        setError(result.error || 'Failed to generate content')
        console.log(
          '❌ Updating lead status back to "imported" due to failure for lead ID:',
          lead.id
        )
        onStatusUpdate?.(lead.id, 'imported')
      }
    } catch (error) {
      console.error('🔥 Error in content generation:', error)

      // Show specific error message to user
      let errorMessage = 'An unexpected error occurred'

      if (error instanceof Error) {
        errorMessage = error.message

        // Add more context for common errors
        if (
          error.message.includes('Model error') ||
          error.message.includes('Model not found')
        ) {
          errorMessage = `${error.message}\n\nTry switching to a different model or check if you have access to the selected model.`
        } else if (error.message.includes('Access forbidden')) {
          errorMessage = `${error.message}\n\nYou may not have access to this model or have exceeded your quota. Try using Claude Haiku instead.`
        } else if (error.message.includes('Invalid API key')) {
          errorMessage = `${error.message}\n\nPlease check your API key configuration in the environment variables.`
        }
      }

      setError(errorMessage)

      // Reset status on error
      console.log(
        '❌ Updating lead status back to "imported" due to exception for lead ID:',
        lead.id
      )
      onStatusUpdate?.(lead.id, 'imported')
    } finally {
      setIsGenerating(false)
      console.log('🏁 Content generation process completed')
    }
  }

  // Custom prompt starts empty - no default initialization

  // File handling functions
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files
    if (!files) return

    const claudeService = createClaudeService()

    for (const file of Array.from(files)) {
      try {
        // First create the attachment with uploading state
        const attachment = await processFile(file)
        if (attachment) {
          attachment.uploading = true
          setFileAttachments((prev) => [...prev, attachment])

          // Try to upload to Claude Files API, fallback to base64 if CORS fails
          try {
            const fileId = await claudeService.uploadFile(file)
            // Update the attachment with the file_id and remove uploading state
            setFileAttachments((prev) =>
              prev.map((f) =>
                f.id === attachment.id
                  ? { ...f, file_id: fileId, uploading: false }
                  : f
              )
            )
          } catch (uploadError) {
            console.warn(
              'Files API upload failed, using base64 fallback:',
              uploadError
            )
            // Fallback to base64 - just mark as ready without file_id
            setFileAttachments((prev) =>
              prev.map((f) =>
                f.id === attachment.id ? { ...f, uploading: false } : f
              )
            )
          }
        }
      } catch (error) {
        setError(
          error instanceof Error ? error.message : 'Failed to process file'
        )
      }
    }

    // Reset input
    event.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const claudeService = createClaudeService()
    const files = Array.from(e.dataTransfer.files)

    for (const file of files) {
      try {
        // First create the attachment with uploading state
        const attachment = await processFile(file)
        if (attachment) {
          attachment.uploading = true
          setFileAttachments((prev) => [...prev, attachment])

          // Try to upload to Claude Files API, fallback to base64 if CORS fails
          try {
            const fileId = await claudeService.uploadFile(file)
            // Update the attachment with the file_id and remove uploading state
            setFileAttachments((prev) =>
              prev.map((f) =>
                f.id === attachment.id
                  ? { ...f, file_id: fileId, uploading: false }
                  : f
              )
            )
          } catch (uploadError) {
            console.warn(
              'Files API upload failed, using base64 fallback:',
              uploadError
            )
            // Fallback to base64 - just mark as ready without file_id
            setFileAttachments((prev) =>
              prev.map((f) =>
                f.id === attachment.id ? { ...f, uploading: false } : f
              )
            )
          }
        }
      } catch (error) {
        setError(
          error instanceof Error ? error.message : 'Failed to process file'
        )
      }
    }
  }

  const removeFile = async (id: string) => {
    const claudeService = createClaudeService()
    const fileToRemove = fileAttachments.find((f) => f.id === id)

    // Delete from Claude Files API if it has a file_id
    if (fileToRemove?.file_id) {
      try {
        await claudeService.deleteFile(fileToRemove.file_id)
      } catch (error) {
        console.warn('Failed to delete file from Claude API:', error)
      }
    }

    setFileAttachments((prev) => prev.filter((f) => f.id !== id))
  }

  // Handle paste events for images
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          try {
            const claudeService = createClaudeService()

            // First create the attachment with uploading state
            const attachment = await processFile(file)
            if (attachment) {
              attachment.uploading = true
              setFileAttachments((prev) => [...prev, attachment])

              // Try to upload to Claude Files API, fallback to base64 if CORS fails
              try {
                const fileId = await claudeService.uploadFile(file)
                // Update the attachment with the file_id and remove uploading state
                setFileAttachments((prev) =>
                  prev.map((f) =>
                    f.id === attachment.id
                      ? { ...f, file_id: fileId, uploading: false }
                      : f
                  )
                )
              } catch (uploadError) {
                console.warn(
                  'Files API upload failed, using base64 fallback:',
                  uploadError
                )
                // Fallback to base64 - just mark as ready without file_id
                setFileAttachments((prev) =>
                  prev.map((f) =>
                    f.id === attachment.id ? { ...f, uploading: false } : f
                  )
                )
              }
            }
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : 'Failed to process pasted image'
            )
          }
        }
      }
    }
  }

  // Shared generation form content
  const renderGenerationModal = () => (
    <>
      <div className="space-y-6">
        {/* Generation Mode Selection - Top Level */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Generation Mode</label>
          <Select
            value={generationMode}
            onValueChange={(value: GenerationMode) => setGenerationMode(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="claude">
                ✨ Claude AI (Dynamic & Personalized)
              </SelectItem>
              <SelectItem value="templates">
                📋 Templates (Structured & Consistent)
              </SelectItem>
              <SelectItem value="fallback">
                🎲 Mock Data (Testing & Demo)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Prompt Section - Disabled for templates */}
        {generationMode !== 'templates' && (
          <div className={`space-y-2`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Your Prompt</label>
                <span className="text-xs text-muted-foreground">
                  ({estimateTokens(customPrompt).toLocaleString()} tokens)
                </span>
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button variant="outline" size="sm" asChild>
                  <span className="flex items-center gap-2">
                    <Upload className="h-3 w-3" />
                    Add Files
                  </span>
                </Button>
              </label>
            </div>

            <div
              className={`relative ${isDragging ? 'ring-2 ring-primary' : ''}`}
            >
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onPaste={handlePaste}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                placeholder={`Tell me about ${getFieldValue('contact') || 'this lead'}`}
                rows={4}
                className="min-h-[100px]"
              />
              {isDragging && (
                <div className="absolute inset-0 bg-primary/5 flex items-center justify-center pointer-events-none rounded-md">
                  <div className="text-primary text-sm font-medium">
                    Drop files here
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* File Attachments - Hidden for templates mode */}
        {generationMode !== 'templates' && fileAttachments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Attached Files </span>
              {tokenInfo.attachmentTokens > 0 && (
                <span>
                  (~{tokenInfo.attachmentTokens.toLocaleString()} tokens)
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {fileAttachments.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-2 p-2 border rounded-md ${
                    file.uploading
                      ? 'bg-blue-50 border-blue-200'
                      : file.file_id
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                  }`}
                >
                  {file.uploading ? (
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                  ) : file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="h-8 w-8 object-cover rounded"
                    />
                  ) : file.type === 'application/pdf' ? (
                    <FileText className="h-8 w-8 text-red-500" />
                  ) : (
                    <Image className="h-8 w-8 text-blue-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">
                      {file.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                      {file.uploading && ' - Uploading...'}
                      {file.file_id && ' - Files API'}
                      {!file.uploading && !file.file_id && ' - Base64'}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    className="h-6 w-6 p-0"
                    disabled={file.uploading}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Prompt & Model Sections - hidden for templates */}
        {generationMode !== 'templates' && (
          <Accordion type="single" collapsible className={`w-full`}>
            <AccordionItem value="system-prompt">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  System Prompt Settings{' '}
                  <span className="text-xs text-muted-foreground">
                    ({estimateTokens(systemPrompt).toLocaleString()} tokens)
                  </span>
                </div>
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

            {/* Model Selection Accordion */}
            <AccordionItem value="model-settings">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  Model:{' '}
                  {tokenInfo.modelInfo?.displayName || 'Claude 3.5 Haiku'}
                  <span className="text-xs text-muted-foreground">
                    ({formatPrice(tokenInfo.pricing.totalCost)} estimated)
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        AI Model {generationMode !== 'claude' && '(Not Used)'}
                      </label>
                      <Select
                        value={selectedModel}
                        onValueChange={setSelectedModel}
                        disabled={generationMode !== 'claude'}
                      >
                        <SelectTrigger
                          className={
                            generationMode !== 'claude' ? 'opacity-50' : ''
                          }
                        >
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="claude-3-5-haiku-20241022">
                            Claude 3.5 Haiku (Fast & Cheap)
                          </SelectItem>
                          <SelectItem value="claude-sonnet-4-20250514">
                            Claude 4 Sonnet (Fast & Reasonable)
                          </SelectItem>
                          <SelectItem value="claude-opus-4-1-20250805">
                            Claude 4.1 Opus (Expensive & Most Capable)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Token Usage & Cost{' '}
                        {generationMode !== 'claude' && '(N/A)'}
                      </label>
                      <div
                        className={`bg-muted/50 rounded-lg p-3 space-y-1 ${generationMode !== 'claude' ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            Input Tokens:
                          </span>
                          <span className="font-mono">
                            {generationMode === 'claude'
                              ? tokenInfo.inputTokens.toLocaleString()
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            Est. Output:
                          </span>
                          <span className="font-mono">
                            {generationMode === 'claude'
                              ? `~${tokenInfo.estimatedOutputTokens.toLocaleString()}`
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="border-t pt-1 mt-1">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="flex items-center gap-1">
                              <Coins className="h-3 w-3" />
                              Est. Cost:
                            </span>
                            <span className="text-primary">
                              {generationMode === 'claude'
                                ? formatPrice(tokenInfo.pricing.totalCost)
                                : 'Free'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {generationMode === 'claude' && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        • Input: $
                        {tokenInfo.modelInfo?.inputPricePerMillion.toFixed(2)}/M
                        tokens
                      </p>
                      <p>
                        • Output: $
                        {tokenInfo.modelInfo?.outputPricePerMillion.toFixed(2)}
                        /M tokens
                      </p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>

      <div className="flex justify-end mt-4">
        <Button
          onClick={() => {
            generateContent()
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
      </div>
    </>
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
    if (!text) return ''

    // Split by double newlines first (paragraphs)
    const paragraphs = text.split('\n\n')

    return paragraphs
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0)
      .map((paragraph) => {
        // Handle single line breaks within paragraphs
        const withLineBreaks = paragraph.replace(/\n/g, '<br>')
        return `<div style="margin-bottom: 16px;">${withLineBreaks}</div>`
      })
      .join('')
  }

  // Extract plain text from HTML (robust, preserves basic line breaks and bullets)
  const convertHtmlToText = (html: string): string => {
    if (!html) return ''
    let text = String(html)

    // Handle our new div format with margin-bottom
    text = text.replace(
      /<div\s+style="margin-bottom:\s*16px;">(.*?)<\/div>/gi,
      '$1\n\n'
    )

    // Normalize common break tags to newlines
    text = text.replace(/<(br|BR)\s*\/?>(\s*)/g, '\n')

    // Add newlines after common block-level closing tags
    text = text.replace(/<\/(p|div|h[1-6]|tr)>/gi, '\n')

    // Lists → bullets
    text = text.replace(/<li[^>]*>/gi, '• ')
    text = text.replace(/<\/li>/gi, '\n')

    // Table/section boundaries to newlines
    text = text.replace(/<\/(ul|ol|table|thead|tbody|tfoot)>/gi, '\n')

    // Strip all remaining tags
    text = text.replace(/<[^>]+>/g, '')

    // Decode HTML entities using the browser
    const textarea = document.createElement('textarea')
    textarea.innerHTML = text
    text = textarea.value

    // Collapse excessive blank lines and trim
    text = text
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+\n/g, '\n')
      .trim()
    return text
  }

  const startEditing = (snippetKey: string) => {
    setEditingSnippet(snippetKey)
    // For HTML snippets, convert to text for easier editing
    const isHtmlSnippet = SNIPPETS.find((s) => s.key === snippetKey)?.isHtml
    const raw = content?.[snippetKey as keyof ClaudeResponse] || ''
    const editValue = isHtmlSnippet
      ? convertHtmlToText(String(raw))
      : String(raw)
    setEditedContent({
      ...editedContent,
      [snippetKey]: editValue,
    })
  }

  const saveEdit = (snippetKey: string) => {
    if (!content) return

    // For HTML snippets, convert text back to HTML for storage
    const isHtmlSnippet = SNIPPETS.find((s) => s.key === snippetKey)?.isHtml
    const edited = editedContent[snippetKey as keyof ClaudeResponse]
    const valueToStore = isHtmlSnippet
      ? convertTextToHtml(String(edited || ''))
      : String(edited || '')

    const updatedContent = {
      ...content,
      [snippetKey]: valueToStore,
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
    toast.success('Saved to LocalStorage')
  }

  const cancelEdit = () => {
    setEditingSnippet(null)
    setEditedContent({})
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      toast.success('Copied to clipboard')
    }
  }

  // Enhanced editing callbacks (Story 1.5)
  const handlePlainTextContentChange = useCallback(
    (newContent: PlainTextContent) => {
      console.log('📝 [Enhanced Editing] Received new content:', newContent)
      setPlainTextContent(newContent)
      console.log('📝 [Enhanced Editing] Plain text content updated in state')
    },
    []
  )

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
            <div className="mt-4">
              <Textarea
                value={String(editedContent[snippet.key] || '')}
                onChange={(e) =>
                  setEditedContent({
                    ...editedContent,
                    [snippet.key]: e.target.value,
                  })
                }
                rows={8}
                className="min-h-[120px] text-sm"
                placeholder="Edit the content here..."
              />
            </div>
          ) : (
            // Preview mode - show rendered content, click to edit
            <div className="space-y-2">
              {snippet.isHtml ? (
                <div
                  className="text-sm border rounded p-3 bg-muted/20 min-h-[80px] cursor-pointer hover:bg-muted/30 transition-colors prose prose-sm max-w-none [&_div]:mb-1"
                  dangerouslySetInnerHTML={{
                    __html: String(displayContent),
                  }}
                  onClick={() => startEditing(String(snippet.key))}
                  title="Click to edit"
                />
              ) : (
                <div
                  className="text-sm border rounded p-3 bg-muted/20 min-h-[60px] cursor-pointer hover:bg-muted/30 transition-colors whitespace-pre-wrap"
                  onClick={() => startEditing(String(snippet.key))}
                  title="Click to edit"
                >
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
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
            {error}
          </div>
        )}

        {!content && !isGenerating && renderGenerationModal()}

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
                  {useEnhancedEditing
                    ? 'Edit content in plain text - click "Prepare JSON" when ready'
                    : '7 snippets for 6-touchpoint email sequence'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {useEnhancedEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditingMode(
                        editingMode === 'plaintext' ? 'html' : 'plaintext'
                      )
                    }
                    disabled={isGenerating}
                    className="gap-2"
                  >
                    {editingMode === 'plaintext'
                      ? 'View HTML'
                      : 'Edit Plain Text'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Clear content state
                    setContent(null)
                    onContentUpdate?.(null)

                    // Enhanced editing: Reset plain text content
                    if (useEnhancedEditing) {
                      setPlainTextContent({
                        snippet1: '',
                        snippet2: '',
                        snippet3: '',
                        snippet4: '',
                        snippet5: '',
                        snippet6: '',
                        snippet7: '',
                      })
                      setEditingMode('plaintext')
                      setShowJsonOutput(false)
                    }

                    // Clear localStorage using service
                    const dbLeadId = String(lead.id)
                    contentGenerationService.clearLeadContent(dbLeadId)

                    // Reset prompt to empty
                    setCustomPrompt('')

                    // Show toast notification
                    toast.info('Content cleared - ready to regenerate')
                  }}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Regenerate
                </Button>
              </div>
            </div>

            {/* Enhanced editing workflow (Story 1.5) */}
            {useEnhancedEditing ? (
              <div className="space-y-6">
                {editingMode === 'plaintext' ? (
                  <PlainTextEditor
                    content={plainTextContent}
                    onChange={handlePlainTextContentChange}
                    editingField={editingPlainTextField}
                    onEditField={setEditingPlainTextField}
                  />
                ) : (
                  <div className="space-y-4">{SNIPPETS.map(renderContent)}</div>
                )}
              </div>
            ) : (
              <div className="space-y-4">{SNIPPETS.map(renderContent)}</div>
            )}

            {/* Approval and JSON Output Section */}
            {useEnhancedEditing && content && (
              <div className="space-y-4">
                {/* Generated Content JSON - only shown after approval */}
                {showJsonOutput && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="json-output">
                      <AccordionTrigger className="text-sm">
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          Generated Content JSON
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          <div>
                            <div className="text-xs text-muted-foreground mb-2">
                              Complete JSON Response:
                            </div>
                            <div className="text-xs font-mono border rounded p-3 bg-muted/50 max-h-96 overflow-auto">
                              <pre>{JSON.stringify(content, null, 2)}</pre>
                            </div>
                          </div>

                          {/* HTML Source for each snippet */}
                          {SNIPPETS.filter((snippet) => snippet.isHtml).map(
                            (snippet) => {
                              const displayContent =
                                editingSnippet === snippet.key
                                  ? (editedContent[snippet.key] as
                                      | string
                                      | undefined) ||
                                    (content?.[snippet.key] as
                                      | string
                                      | undefined)
                                  : (content?.[snippet.key] as
                                      | string
                                      | undefined) || ''

                              return (
                                <div key={snippet.key}>
                                  <div className="text-xs text-muted-foreground mb-2">
                                    {snippet.label} HTML:
                                  </div>
                                  <div className="text-xs font-mono border rounded p-3 bg-muted/50 max-h-48 overflow-auto">
                                    <pre>{displayContent}</pre>
                                  </div>
                                </div>
                              )
                            }
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </div>
            )}

            {/* Original JSON output for non-enhanced editing mode */}
            {!useEnhancedEditing && content && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="json-output">
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Generated Content JSON & HTML Source
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs text-muted-foreground mb-2">
                          Complete JSON Response:
                        </div>
                        <div className="text-xs font-mono border rounded p-3 bg-muted/50 max-h-96 overflow-auto">
                          <pre>{JSON.stringify(content, null, 2)}</pre>
                        </div>
                      </div>

                      {/* HTML Source for each snippet */}
                      {SNIPPETS.filter((snippet) => snippet.isHtml).map(
                        (snippet) => {
                          const displayContent =
                            editingSnippet === snippet.key
                              ? (editedContent[snippet.key] as
                                  | string
                                  | undefined) ||
                                (content?.[snippet.key] as string | undefined)
                              : (content?.[snippet.key] as
                                  | string
                                  | undefined) || ''

                          return (
                            <div key={`html-${snippet.key}`}>
                              <div className="text-xs text-muted-foreground mb-2">
                                {snippet.label} - HTML Source:
                              </div>
                              <div className="text-xs font-mono border rounded p-3 bg-muted/50 max-h-48 overflow-auto">
                                {String(displayContent)}
                              </div>
                            </div>
                          )
                        }
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
