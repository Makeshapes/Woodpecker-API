import emailSequenceTemplate from '../templates/emailSequencePrompt.json'

export interface TemplateVariable {
  name: string
  value: string
}

export interface Template {
  name: string
  description: string
  template: string
  variables: string[]
  expectedOutputs: string[]
}

export interface LeadData {
  first_name: string
  last_name: string
  company: string
  title: string
  email: string
  industry: string
  linkedin_url: string
  tags?: string
}

export class TemplateValidationError extends Error {
  public missingVariables: string[]

  constructor(message: string, missingVariables: string[] = []) {
    super(message)
    this.missingVariables = missingVariables
    this.name = 'TemplateValidationError'
  }
}

export class TemplateService {
  private templates: Map<string, Template> = new Map()

  constructor() {
    this.loadTemplates()
  }

  private loadTemplates(): void {
    // Load the email sequence template
    this.templates.set('email-sequence', emailSequenceTemplate as Template)
  }

  getTemplate(name: string): Template | null {
    return this.templates.get(name) || null
  }

  getAllTemplates(): Template[] {
    return Array.from(this.templates.values())
  }

  validateLeadData(
    leadData: LeadData,
    templateName: string = 'email-sequence'
  ): void {
    const template = this.getTemplate(templateName)
    if (!template) {
      throw new TemplateValidationError(`Template '${templateName}' not found`)
    }

    const missingFields: string[] = []
    const requiredFields = template.variables

    for (const field of requiredFields) {
      if (
        !leadData[field as keyof LeadData] ||
        leadData[field as keyof LeadData]?.trim() === ''
      ) {
        missingFields.push(field)
      }
    }

    if (missingFields.length > 0) {
      throw new TemplateValidationError(
        `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      )
    }
  }

  substituteVariables(templateString: string, leadData: LeadData): string {
    let result = templateString

    // Replace all template variables with actual data
    Object.entries(leadData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      result = result.replace(regex, value || '')
    })

    // Check for any remaining unsubstituted variables
    const unsubstitutedVars = result.match(/\{\{[^}]+\}\}/g)
    if (unsubstitutedVars) {
      const varNames = unsubstitutedVars.map((v) => v.replace(/[{}]/g, ''))
      throw new TemplateValidationError(
        `Unsubstituted template variables: ${varNames.join(', ')}`,
        varNames
      )
    }

    return result
  }

  generatePrompt(
    leadData: LeadData,
    templateName: string = 'email-sequence'
  ): string {
    // Validate lead data
    this.validateLeadData(leadData, templateName)

    // Get template
    const template = this.getTemplate(templateName)
    if (!template) {
      throw new TemplateValidationError(`Template '${templateName}' not found`)
    }

    // Add tags if not present
    const enrichedLeadData = {
      ...leadData,
      tags: leadData.tags || this.generateTags(leadData),
    }

    // Get the base prompt from template
    let prompt = this.substituteVariables(template.template, enrichedLeadData)
    
    // If there's a custom_prompt, add it as additional context
    // @ts-expect-error - custom_prompt might not be in LeadData interface
    if (leadData.custom_prompt && typeof leadData.custom_prompt === 'string' && leadData.custom_prompt.trim()) {
      const customPrompt = leadData.custom_prompt.trim()
      console.log('📨 [TemplateService] Custom prompt detected!')
      console.log('📏 [TemplateService] Custom prompt length:', customPrompt.length, 'characters')
      console.log('📝 [TemplateService] Custom prompt content:', customPrompt.substring(0, 200) + (customPrompt.length > 200 ? '...' : ''))
      
      // Add the custom prompt as high-priority context at the beginning
      const originalPromptLength = prompt.length
      prompt = `**IMPORTANT CONTEXT FROM USER:**\n${customPrompt}\n\n**USE THE ABOVE CONTEXT TO PERSONALIZE THE EMAIL SEQUENCE**\n\n${prompt}`
      
      console.log('✅ [TemplateService] Custom prompt added to template')
      console.log('📊 [TemplateService] Prompt length before custom:', originalPromptLength, 'chars')
      console.log('📊 [TemplateService] Prompt length after custom:', prompt.length, 'chars')
    } else {
      console.log('ℹ️ [TemplateService] No custom prompt provided or custom prompt is empty')
    }
    
    return prompt
  }

  private generateTags(leadData: LeadData): string {
    const tags = []

    if (leadData.industry) {
      tags.push(`#${leadData.industry.replace(/\s+/g, '')}`)
    }

    if (leadData.company) {
      // Add relevant business tags based on company
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
      } else if (
        leadData.company.toLowerCase().includes('health') ||
        leadData.company.toLowerCase().includes('medical')
      ) {
        tags.push('#Healthcare')
      }
    }

    if (leadData.title) {
      const titleLower = leadData.title.toLowerCase()
      if (titleLower.includes('learning') || titleLower.includes('training')) {
        tags.push('#LearningDevelopment')
      }
      if (titleLower.includes('vp') || titleLower.includes('vice president')) {
        tags.push('#Leadership')
      } else if (titleLower.includes('director')) {
        tags.push('#Management')
      }
    }

    return tags.join(' ') || '#Professional'
  }

  validateGeneratedContent(
    content: Record<string, unknown>,
    templateName: string = 'email-sequence'
  ): boolean {
    const template = this.getTemplate(templateName)
    if (!template) {
      return false
    }

    // Check if all expected outputs are present
    for (const expectedOutput of template.expectedOutputs) {
      if (!content[expectedOutput]) {
        return false
      }
    }

    // Validate snippet formats
    if (
      content.snippet1 &&
      (content.snippet1.length < 36 || content.snippet1.length > 50)
    ) {
      return false
    }

    if (content.snippet3 && content.snippet3.length > 300) {
      return false
    }

    // Check HTML snippets contain div tags
    const htmlSnippets = [
      'snippet2',
      'snippet4',
      'snippet5',
      'snippet6',
      'snippet7',
    ]
    for (const snippetKey of htmlSnippets) {
      if (content[snippetKey] && !content[snippetKey].includes('<div>')) {
        return false
      }
    }

    return true
  }
}

export const templateService = new TemplateService()
