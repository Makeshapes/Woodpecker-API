import type { LeadData } from './templateService'
import type { ClaudeResponse } from './claudeService'
import { detectTimezone } from '@/utils/timezoneDetector'

export interface EmailTemplate {
  step: number
  type: 'email' | 'linkedin'
  subject: string
  body: string
  description: string
}

export interface TemplateConfig {
  name: string
  description: string
  templates: EmailTemplate[]
}

interface GeneratedContent extends ClaudeResponse {
  [key: string]: string // Allow dynamic snippet keys like snippet1, snippet2, etc.
}

export class TemplateBasedGenerationService {
  private templates: Map<string, TemplateConfig> = new Map()

  constructor() {
    this.loadTemplates()
  }

  private loadTemplates(): void {
    // Default Makeshapes template based on the example provided
    const makeshapesTemplate: TemplateConfig = {
      name: 'makeshapes-outreach',
      description: 'Makeshapes Group Learning Outreach Sequence',

      templates: [
        {
          step: 1,
          type: 'email',
          subject: 'Delivering group learning at scale',
          description: 'Day 1 - Email subject line only',
          body: '',
        },
        {
          step: 2,
          type: 'email',
          subject: 'Delivering group learning at scale',
          description: 'Day 1 - Full intro email',
          body: `Hi {{FIRST_NAME}},

We've built a new approach to group learning that's not dependent on facilitators. Our main focus has been supporting dispersed orgs facing these key challenges:

<div>
<li>Delivering at scale</li>
<li>Delivering consistently</li>
<li>Delivering quickly</li>
</div>

Curious if these are challenges you are facing at {{COMPANY}}. If so, interested to talk?

—Dan`,
        },
        {
          step: 3,
          type: 'linkedin',
          subject: '',
          description: 'Day 3 - LinkedIn message',
          body: `Hi {{FIRST_NAME}}, I sent you an email about group learning solutions for {{COMPANY}}. Would love to connect and discuss how we're helping {{INDUSTRY}} organizations scale their learning delivery. Thanks!`,
        },

        {
          step: 4,
          type: 'email',
          subject:
            'Re: Fw: Meeting with {{FIRST_NAME}} - Delivering group learning at scale',
          description: 'Day 3 - Email with social proof',
          body: `{{FIRST_NAME}}—for context, we're helping organisations like QBE Insurance, Westpac Bank, AirNZ, Zespri International and others deliver various formats of group learning (leader-led, peer-to-peer, train-the-trainer).

Open to learning more?

—Dan`,
        },
        {
          step: 5,
          type: 'email',
          subject:
            'Re: Fw: Meeting with {{FIRST_NAME}} - Delivering group learning at scale',
          description: 'Day 4 - Email with video case study',
          body: `{{FIRST_NAME}},

I'm conscious there's a lot of noise in the learning tech space—everyone saying they have something unique. 

If it helps to hear from someone in a similar role, check out this short video from Lane Hannah and his experience transforming delivery of group/social learning at a large Telecommunications company.

https://www.makeshapes.com/resources/one-nz-case-study

If it piques your curiosity let's find time to have a call.

—Dan`,
        },
        {
          step: 6,
          type: 'email',
          subject:
            'Re: Fw: Meeting with {{FIRST_NAME}} - Delivering group learning at scale',
          description: 'Day 5 - Demo offer email',
          body: `{{FIRST_NAME}}, sometimes it's easier to show, rather than tell. Just reply "yes" if you're interested in me sharing a demo link to an experience with you.

Alternatively happy to book in some time and give you a live demo.

—Dan

PS - If there is someone else in the team that I should speak with, let me know.`,
        },
        {
          step: 7,
          type: 'email',
          subject:
            'Re: Fw: Meeting with {{FIRST_NAME}} - Delivering group learning at scale',
          description: 'Day 7 - Final breakup email',
          body: `{{FIRST_NAME}},

I'll stop reaching out for now, but wanted to leave you with this thought:

Most {{INDUSTRY}} organizations struggle with the trade-off between learning quality and scale. We've found a way to deliver both.

If this becomes a priority for {{COMPANY}} in the future, feel free to reach out.

All the best,
—Dan`,
        },
      ],
    }

    this.templates.set('makeshapes-outreach', makeshapesTemplate)
  }

  generateTemplateBasedContent(
    leadData: LeadData,
    templateName: string = 'makeshapes-outreach'
  ): ClaudeResponse {
    console.log('📋 [TemplateBasedService] Generating template-based content')
    console.log('📑 [TemplateBasedService] Template:', templateName)
    console.log(
      '👤 [TemplateBasedService] Lead:',
      leadData.first_name,
      leadData.last_name
    )

    const template = this.templates.get(templateName)
    if (!template) {
      throw new Error(`Template '${templateName}' not found`)
    }

    // Detect timezone from location data
    const detectedTimezone = detectTimezone(
      leadData.city,
      leadData.state,
      leadData.country
    );

    console.log('🌍 [TemplateBasedService] Adding location and timezone data:', {
      city: leadData.city,
      state: leadData.state,
      country: leadData.country,
      detectedTimezone: detectedTimezone
    });

    // Generate content for each step
    const content: GeneratedContent = {
      email: leadData.email,
      first_name: leadData.first_name,
      last_name: leadData.last_name,
      company: leadData.company,
      title: leadData.title,
      linkedin_url: leadData.linkedin_url,
      city: leadData.city,
      state: leadData.state,
      country: leadData.country,
      timezone: detectedTimezone,
      tags: leadData.tags || this.generateTags(leadData),
      industry: leadData.industry,
      snippet1: '',
      snippet2: '',
      snippet3: '',
      snippet4: '',
      snippet5: '',
      snippet6: '',
      snippet7: '',
    }

    // Generate each snippet by substituting variables in templates
    template.templates.forEach((emailTemplate, index) => {
      const snippetKey = `snippet${index + 1}`

      if (emailTemplate.type === 'email') {
        // For emails, create HTML structure with subject and body
        const subject = this.substituteVariables(
          emailTemplate.subject,
          leadData
        )
        const body = this.substituteVariables(emailTemplate.body, leadData)

        if (emailTemplate.body.trim() === '') {
          // Subject-only step (like Step 1)
          content[snippetKey] = subject
        } else {
          // Full email with body (no subject repetition, no footer)
          content[snippetKey] =
            `<div>${body.replace(/\n/g, '</div><div>')}</div><div><br></div>`
        }
      } else {
        // For LinkedIn messages, just the body content
        const body = this.substituteVariables(emailTemplate.body, leadData)
        content[snippetKey] = body
      }
    })

    // Ensure we have all 7 snippets (pad with empty if needed)
    for (let i = 1; i <= 7; i++) {
      const snippetKey = `snippet${i}`
      if (!content[snippetKey]) {
        content[snippetKey] = `<div>Step ${i} content not available</div>`
      }
    }

    console.log(
      '✅ [TemplateBasedService] Generated',
      Object.keys(content).filter((k) => k.startsWith('snippet')).length,
      'snippets'
    )

    return content
  }

  private substituteVariables(text: string, leadData: LeadData): string {
    let result = text

    // Replace all template variables with actual data
    const substitutions = {
      '{{FIRST_NAME}}': leadData.first_name || 'there',
      '{{LAST_NAME}}': leadData.last_name || '',
      '{{COMPANY}}': leadData.company || 'your organization',
      '{{TITLE}}': leadData.title || 'your role',
      '{{EMAIL}}': leadData.email || '',
      '{{INDUSTRY}}': leadData.industry || 'your industry',
      '{{LINKEDIN_URL}}': leadData.linkedin_url || '',
    }

    Object.entries(substitutions).forEach(([placeholder, value]) => {
      const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g')
      result = result.replace(regex, value)
    })

    return result
  }

  private generateTags(leadData: LeadData): string {
    const tags = []

    if (leadData.industry) {
      tags.push(`#${leadData.industry.replace(/\s+/g, '')}`)
    }

    if (leadData.company) {
      if (
        leadData.company.toLowerCase().includes('financial') ||
        leadData.company.toLowerCase().includes('bank')
      ) {
        tags.push('#FinancialServices')
      } else if (
        leadData.company.toLowerCase().includes('tech') ||
        leadData.company.toLowerCase().includes('software')
      ) {
        tags.push('#Technology')
      }
    }

    return tags.join(' ') || '#Professional'
  }

  getAvailableTemplates(): TemplateConfig[] {
    return Array.from(this.templates.values())
  }

  getTemplate(name: string): TemplateConfig | null {
    return this.templates.get(name) || null
  }
}

export const templateBasedGenerationService =
  new TemplateBasedGenerationService()
