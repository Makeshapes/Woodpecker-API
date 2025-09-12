import type { ClaudeResponse } from './claudeService'
import type { LeadData } from './templateService'

export interface FallbackExample {
  industry: string
  example: ClaudeResponse
}

export class FallbackDataService {
  private fallbackExamples: FallbackExample[] = [
    {
      industry: 'Financial Services',
      example: {
        email: 'john.smith@allyfinancial.com',
        first_name: 'John',
        last_name: 'Smith',
        company: 'Ally Financial',
        title: 'VP of Learning & Development',
        linkedin_url: 'https://www.linkedin.com/in/johnsmith/',
        tags: '#FinancialServices #DigitalTransformation #Banking #Leadership',
        industry: 'Financial Services',
        snippet1: "Ally's 2,000 new hire onboarding challenge",
        snippet2:
          "<div>Hi John,</div><div><br></div><div>I noticed Ally's announcement about hiring 2,000 new digital banking employees this year. That's an impressive growth trajectory!</div><div><br></div><div>We recently helped JPMorgan Chase reduce their new hire ramp time by 40% through our AI-powered learning platform. With Ally's focus on digital innovation, I thought this might interest you.</div><div><br></div><div>The ROI was substantial - they saved over $2.3M in training costs while improving employee satisfaction scores by 25%.</div><div><br></div><div>Would you be open to a brief conversation about how this might apply to Ally's expansion?</div><div><br></div><div>Best,</div><div>Sarah</div>",
        snippet3:
          "Hi John! Saw Ally's big hiring announcement. We helped JPMorgan reduce onboarding time 40% with AI. Worth a quick chat about your plans?",
        snippet4:
          "<div>Hi John,</div><div><br></div><div>Just following up on my note about our work with JPMorgan Chase on scaling their training programs.</div><div><br></div><div>Quick question - what's your biggest challenge with onboarding 2,000 new hires?</div><div><br></div><div>Best,</div><div>Sarah</div>",
        snippet5:
          "<div>Hi John,</div><div><br></div><div>I know you're probably swamped with the massive hiring initiative at Ally. That's exactly why I wanted to reach out one more time.</div><div><br></div><div>We've helped other major financial institutions like Wells Fargo and Bank of America automate their training workflows during rapid expansion phases.</div><div><br></div><div>The average time savings was 60 hours per new hire - which at your scale could mean 120,000 hours saved across your 2,000 new employees.</div><div><br></div><div>Would a 15-minute call this week make sense to explore if this could help Ally?</div><div><br></div><div>Best,</div><div>Sarah</div>",
        snippet6:
          '<div>Hi John,</div><div><br></div><div>One final note about your onboarding challenge at Ally.</div><div><br></div><div>We have a financial services case study that shows exactly how this works. Would you like me to send it over?</div><div><br></div><div>Best,</div><div>Sarah</div>',
        snippet7:
          "<div>Hi John,</div><div><br></div><div>I'll stop reaching out after this, but wanted to leave you with something valuable.</div><div><br></div><div>Even if our solution isn't the right fit, I'd love to send you our \"Financial Services Training Automation Playbook\" - it's helped dozens of VP's in similar situations.</div><div><br></div><div>No strings attached. Just industry best practices from leaders who've scaled training programs like you're doing at Ally.</div><div><br></div><div>Should I send it over?</div><div><br></div><div>Best,</div><div>Sarah</div>",
      },
    },
    {
      industry: 'Technology',
      example: {
        email: 'sarah.chen@microsoft.com',
        first_name: 'Sarah',
        last_name: 'Chen',
        company: 'Microsoft',
        title: 'Director of Global Learning',
        linkedin_url: 'https://www.linkedin.com/in/sarahchen/',
        tags: '#Technology #AITransformation #GlobalTraining #Management',
        industry: 'Technology',
        snippet1: "Microsoft's AI upskilling for 50,000 employees",
        snippet2:
          "<div>Hi Sarah,</div><div><br></div><div>Microsoft's commitment to upskilling 50,000 employees in AI is truly impressive. As someone leading global learning initiatives, you're at the center of one of the most ambitious training programs in tech.</div><div><br></div><div>We recently partnered with Google to implement similar AI training at scale - helping them reduce skill gaps by 45% while cutting training costs by 30%.</div><div><br></div><div>Given Microsoft's focus on democratizing AI, I thought you'd appreciate seeing how other tech giants are accelerating their AI education programs.</div><div><br></div><div>Would you be interested in a brief conversation about proven strategies for large-scale AI upskilling?</div><div><br></div><div>Best,</div><div>Alex</div>",
        snippet3:
          "Hi Sarah! Microsoft's 50K AI upskilling initiative is amazing. We helped Google achieve similar scale with 45% faster results. Quick chat about your approach?",
        snippet4:
          "<div>Hi Sarah,</div><div><br></div><div>Following up on our AI training conversation.</div><div><br></div><div>What's been your biggest challenge in scaling AI education across 50,000 Microsoft employees?</div><div><br></div><div>Best,</div><div>Alex</div>",
        snippet5:
          "<div>Hi Sarah,</div><div><br></div><div>I know Microsoft's AI upskilling program is a top priority right now. That's exactly why I wanted to share something that might help.</div><div><br></div><div>We've worked with Amazon, Google, and Meta on similar large-scale AI training initiatives. The common thread? They all struggled with the same challenge - measuring actual skill acquisition at scale.</div><div><br></div><div>Our platform helped them track real competency development, not just course completion. The result? 3x higher retention rates and measurable productivity gains within 90 days.</div><div><br></div><div>Would a 20-minute call make sense to discuss how this could accelerate Microsoft's AI transformation?</div><div><br></div><div>Best,</div><div>Alex</div>",
        snippet6:
          '<div>Hi Sarah,</div><div><br></div><div>Quick question about your AI upskilling program at Microsoft.</div><div><br></div><div>Are you measuring actual skill development or just training completion? We have a tech industry benchmark report that might interest you.</div><div><br></div><div>Best,</div><div>Alex</div>',
        snippet7:
          "<div>Hi Sarah,</div><div><br></div><div>This will be my last note, but I wanted to offer something valuable regardless of whether we work together.</div><div><br></div><div>I have Microsoft's AI Training ROI Calculator that we developed specifically for large-scale tech initiatives like yours. It shows the projected impact of different training approaches on skill development and productivity.</div><div><br></div><div>It's helped other Directors of Learning optimize their budgets and prove ROI to leadership. Would you find this useful?</div><div><br></div><div>Best,</div><div>Alex</div>",
      },
    },
    {
      industry: 'Healthcare',
      example: {
        email: 'michael.johnson@kaiserpermanente.org',
        first_name: 'Michael',
        last_name: 'Johnson',
        company: 'Kaiser Permanente',
        title: 'VP of Clinical Education',
        linkedin_url: 'https://www.linkedin.com/in/michaeljohnson/',
        tags: '#Healthcare #ClinicalTraining #PatientSafety #Leadership',
        industry: 'Healthcare',
        snippet1: "Kaiser's 30,000 nurse safety protocol training",
        snippet2:
          "<div>Hi Michael,</div><div><br></div><div>Kaiser Permanente's commitment to training 30,000 nurses on new safety protocols is exactly the kind of initiative that saves lives. As VP of Clinical Education, you're tackling one of healthcare's most critical challenges.</div><div><br></div><div>We recently helped Mayo Clinic implement similar large-scale clinical training, reducing protocol adherence time by 35% while improving patient safety scores across all locations.</div><div><br></div><div>The key was creating personalized learning paths that adapted to each clinician's experience level and specialty. Mayo saw immediate improvements in both compliance rates and patient outcomes.</div><div><br></div><div>Would you be interested in learning how this approach could accelerate Kaiser's safety protocol adoption?</div><div><br></div><div>Best,</div><div>Dr. Patricia Williams</div>",
        snippet3:
          "Hi Michael! Kaiser's 30K nurse safety training is impressive. We helped Mayo Clinic achieve 35% faster protocol adoption. Worth discussing your approach?",
        snippet4:
          "<div>Hi Michael,</div><div><br></div><div>Quick follow-up on our conversation about clinical training at scale.</div><div><br></div><div>What's your biggest concern about ensuring 30,000 nurses properly adopt the new safety protocols?</div><div><br></div><div>Best,</div><div>Dr. Patricia Williams</div>",
        snippet5:
          "<div>Hi Michael,</div><div><br></div><div>I know patient safety is your top priority with this massive training initiative at Kaiser. That's why I wanted to share something that could make a real difference.</div><div><br></div><div>We've helped Johns Hopkins, Cleveland Clinic, and Mayo Clinic with similar large-scale clinical education programs. The challenge is always the same - ensuring busy healthcare workers actually retain and apply new protocols.</div><div><br></div><div>Our approach resulted in 89% protocol compliance within 30 days (compared to the industry average of 60% at 90 days). More importantly, our clients saw measurable improvements in patient safety metrics.</div><div><br></div><div>Would a brief conversation about proven clinical training strategies be valuable for Kaiser's initiative?</div><div><br></div><div>Best,</div><div>Dr. Patricia Williams</div>",
        snippet6:
          '<div>Hi Michael,</div><div><br></div><div>One question about your safety protocol training at Kaiser.</div><div><br></div><div>How are you planning to measure actual behavior change vs. just training completion? We have healthcare-specific assessment tools that might help.</div><div><br></div><div>Best,</div><div>Dr. Patricia Williams</div>',
        snippet7:
          '<div>Hi Michael,</div><div><br></div><div>This is my final message, but I wanted to offer something that could benefit Kaiser regardless of our potential partnership.</div><div><br></div><div>I\'d like to share our "Healthcare Training Effectiveness Audit" - a framework we developed specifically for clinical education leaders like yourself. It helps identify gaps between training delivery and actual behavior change.</div><div><br></div><div>It\'s been used by over 200 hospitals to improve their training ROI and, more importantly, patient outcomes. No cost, no obligations - just a resource that might help with your 30,000 nurse initiative.</div><div><br></div><div>Should I send it over?</div><div><br></div><div>Best,</div><div>Dr. Patricia Williams</div>',
      },
    },
  ]

  // Generate fallback content based on lead data
  generateFallbackContent(leadData: LeadData): ClaudeResponse {
    // Find the best matching industry example
    const example = this.findBestMatch(leadData)

    // Customize the example with actual lead data
    return {
      ...example.example,
      email: leadData.email,
      first_name: leadData.first_name,
      last_name: leadData.last_name,
      company: leadData.company,
      title: leadData.title,
      linkedin_url: leadData.linkedin_url,
      industry: leadData.industry,
      tags: this.generateTagsFromIndustry(leadData),
    }
  }

  // Find the best matching example based on industry and title
  private findBestMatch(leadData: LeadData): FallbackExample {
    // Try exact industry match first
    const industryMatch = this.fallbackExamples.find(
      (example) =>
        example.industry.toLowerCase() === leadData.industry.toLowerCase()
    )

    if (industryMatch) {
      return industryMatch
    }

    // Try partial industry match
    const partialMatch = this.fallbackExamples.find(
      (example) =>
        leadData.industry
          .toLowerCase()
          .includes(example.industry.toLowerCase()) ||
        example.industry.toLowerCase().includes(leadData.industry.toLowerCase())
    )

    if (partialMatch) {
      return partialMatch
    }

    // Default to technology example
    return (
      this.fallbackExamples.find(
        (example) => example.industry === 'Technology'
      ) || this.fallbackExamples[0]
    )
  }

  private generateTagsFromIndustry(leadData: LeadData): string {
    const tags = [`#${leadData.industry.replace(/\s+/g, '')}`]

    // Add title-based tags
    const titleLower = leadData.title.toLowerCase()
    if (titleLower.includes('vp') || titleLower.includes('vice president')) {
      tags.push('#Leadership')
    } else if (titleLower.includes('director')) {
      tags.push('#Management')
    }

    if (
      titleLower.includes('learning') ||
      titleLower.includes('training') ||
      titleLower.includes('education')
    ) {
      tags.push('#LearningDevelopment')
    }

    // Add industry-specific tags
    const industryLower = leadData.industry.toLowerCase()
    if (industryLower.includes('financial') || industryLower.includes('bank')) {
      tags.push('#DigitalTransformation', '#Banking')
    } else if (
      industryLower.includes('tech') ||
      industryLower.includes('software')
    ) {
      tags.push('#Innovation', '#DigitalTransformation')
    } else if (
      industryLower.includes('health') ||
      industryLower.includes('medical')
    ) {
      tags.push('#PatientSafety', '#ClinicalTraining')
    }

    return tags.join(' ')
  }

  // Get all available fallback examples
  getAllExamples(): FallbackExample[] {
    return [...this.fallbackExamples]
  }

  // Get example by industry
  getExampleByIndustry(industry: string): FallbackExample | null {
    return (
      this.fallbackExamples.find(
        (example) => example.industry.toLowerCase() === industry.toLowerCase()
      ) || null
    )
  }
}

export const fallbackDataService = new FallbackDataService()
