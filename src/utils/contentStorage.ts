import type { ApiResult, GeneratedContentRecord } from '@/types/api'
import { isApiSuccess, isApiError } from '@/types/api'
import type { ClaudeResponse } from '@/services/claudeService'

// Helper function to convert ClaudeResponse to GeneratedContentRecord format
function convertClaudeResponseToRecord(
  leadId: number,
  content: ClaudeResponse,
  touchpoint: number = 1
): Omit<GeneratedContentRecord, 'id' | 'created_at' | 'updated_at'> {
  return {
    lead_id: leadId,
    touchpoint,
    content_type: 'email_sequence',
    content: content,
    status: 'generated'
  }
}

// Helper function to convert GeneratedContentRecord to ClaudeResponse
function convertRecordToClaudeResponse(record: GeneratedContentRecord): ClaudeResponse {
  return record.content as ClaudeResponse
}

export const contentStorage = {
  // Get content for a specific lead
  async getLeadContent(leadId: string): Promise<ClaudeResponse | null> {
    try {
      const response = await window.api.content.getByLead(parseInt(leadId))

      if (isApiError(response)) {
        console.error('Error getting lead content:', response.error)
        return null
      }

      // Ensure response.data exists and is an array before accessing [0]
      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        return null
      }

      // Return the first content record if available
      const contentRecord = response.data[0]
      return contentRecord ? convertRecordToClaudeResponse(contentRecord) : null
    } catch (error) {
      console.error('Error getting lead content:', error)
      return null
    }
  },

  // Check if content exists for a lead
  async hasLeadContent(leadId: string): Promise<boolean> {
    try {
      const response = await window.api.content.getByLead(parseInt(leadId))

      if (isApiError(response)) {
        return false
      }

      return response.data && Array.isArray(response.data) && response.data.length > 0
    } catch (error) {
      console.error('Error checking lead content:', error)
      return false
    }
  },

  // Store content for a lead
  async persistContentToStorage(
    leadId: string,
    content: ClaudeResponse,
    touchpoint: number = 1
  ): Promise<boolean> {
    try {
      const contentRecord = convertClaudeResponseToRecord(
        parseInt(leadId),
        content,
        touchpoint
      )
      
      const response = await window.api.content.create(contentRecord)
      
      if (isApiError(response)) {
        console.error('Error persisting content:', response.error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error persisting content:', error)
      return false
    }
  },

  // Clear content for a specific lead
  async clearLeadContent(leadId: string): Promise<boolean> {
    try {
      const response = await window.api.content.getByLead(parseInt(leadId))

      if (isApiError(response)) {
        console.error('Error getting content for deletion:', response.error)
        return false
      }

      // Ensure response.data exists and is an array before processing
      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        return true // No content to delete, consider this successful
      }

      // Delete all content records for this lead
      const deletePromises = response.data.map(record =>
        window.api.content.delete(record.id)
      )
      
      const deleteResponses = await Promise.all(deletePromises)
      const hasErrors = deleteResponses.some(response => isApiError(response))
      
      if (hasErrors) {
        console.error('Some content deletions failed')
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error clearing lead content:', error)
      return false
    }
  },

  // Clear all generated content
  async clearAllContent(): Promise<boolean> {
    try {
      // This would require a new API method to get all content
      // For now, we'll implement a basic version
      console.warn('clearAllContent not fully implemented - would need API method to get all content')
      return true
    } catch (error) {
      console.error('Error clearing all content:', error)
      return false
    }
  },

  // Get content by touchpoint
  async getContentByTouchpoint(touchpoint: number): Promise<GeneratedContentRecord[]> {
    try {
      const response = await window.api.content.getByTouchpoint(touchpoint)
      
      if (isApiError(response)) {
        console.error('Error getting content by touchpoint:', response.error)
        return []
      }
      
      return response.data
    } catch (error) {
      console.error('Error getting content by touchpoint:', error)
      return []
    }
  },

  // Update content status
  async updateContentStatus(
    contentId: number,
    status: GeneratedContentRecord['status']
  ): Promise<boolean> {
    try {
      const response = await window.api.content.update(contentId, { status })
      
      if (isApiError(response)) {
        console.error('Error updating content status:', response.error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error updating content status:', error)
      return false
    }
  }
}
