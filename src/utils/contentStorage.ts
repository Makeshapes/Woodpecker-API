import type { ApiResult, GeneratedContentRecord } from '@/types/api'
import { isApiSuccess, isApiError } from '@/types/api'
import type { ClaudeResponse } from '@/services/claudeService'

// Helper function to convert ClaudeResponse to GeneratedContentRecord format
function convertClaudeResponseToRecord(
  leadId: number,
  content: ClaudeResponse,
  touchpoint: number = 1
): Omit<GeneratedContentRecord, 'id' | 'generated_at' | 'approved_at'> {
  return {
    lead_id: leadId,
    touchpoint_number: touchpoint,
    content_type: 'email',
    content: JSON.stringify(content),
    status: 'draft',
  }
}

// Helper function to convert GeneratedContentRecord to ClaudeResponse
function convertRecordToClaudeResponse(
  record: GeneratedContentRecord
): ClaudeResponse {
  try {
    return JSON.parse(record.content) as ClaudeResponse
  } catch (error) {
    console.error('Error parsing content from database:', error)
    // Return a fallback object if parsing fails
    return record.content as unknown as ClaudeResponse
  }
}

export const contentStorage = {
  // Get content for a specific lead
  async getLeadContent(leadId: string): Promise<ClaudeResponse | null> {
    try {
      console.log('🔍 [contentStorage] Getting content for lead:', leadId)

      const response = await window.api.content.getByLead(parseInt(leadId))

      console.log('🔍 [contentStorage] Database response:', {
        hasError: isApiError(response),
        isArray: Array.isArray(response),
        responseLength: Array.isArray(response) ? response.length : 0,
        fullResponse: response
      })

      if (isApiError(response)) {
        console.error('Error getting lead content:', response.error)
        return null
      }

      // The IPC call returns the array directly, not wrapped in { data: [...] }
      if (
        !Array.isArray(response) ||
        response.length === 0
      ) {
        console.log('🔍 [contentStorage] No content found in database for lead:', leadId)
        return null
      }

      // Return the first content record if available
      const contentRecord = response[0]
      const claudeResponse = contentRecord ? convertRecordToClaudeResponse(contentRecord) : null

      console.log('✅ [contentStorage] Content retrieved from database:', {
        leadId,
        hasContent: !!claudeResponse,
        contentKeys: claudeResponse ? Object.keys(claudeResponse) : []
      })

      return claudeResponse
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

      return (
        response.data &&
        Array.isArray(response.data) &&
        response.data.length > 0
      )
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
      const numericId = parseInt(leadId)
      if (!Number.isFinite(numericId)) {
        console.error(
          'Error persisting content: invalid leadId, expected numeric database id, received:',
          leadId
        )
        return false
      }

      console.log('💾 [contentStorage] Persisting content to database:', {
        leadId: numericId,
        touchpoint,
        hasContent: !!content,
        contentKeys: content ? Object.keys(content) : []
      })

      const contentRecord = convertClaudeResponseToRecord(
        numericId,
        content,
        touchpoint
      )

      console.log('💾 [contentStorage] Content record prepared:', {
        lead_id: contentRecord.lead_id,
        touchpoint_number: contentRecord.touchpoint_number,
        content_type: contentRecord.content_type,
        status: contentRecord.status,
        contentLength: contentRecord.content.length
      })

      const response = await window.api.content.create(contentRecord)

      console.log('💾 [contentStorage] Database save response:', {
        success: !isApiError(response),
        isError: isApiError(response),
        responseData: response,
        savedContentId: response.data?.id
      })

      if (isApiError(response)) {
        console.error('Error persisting content:', response.error)
        return false
      }

      console.log('✅ [contentStorage] Content successfully persisted to database')
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
      if (
        !response.data ||
        !Array.isArray(response.data) ||
        response.data.length === 0
      ) {
        return true // No content to delete, consider this successful
      }

      // Delete all content records for this lead
      const deletePromises = response.data.map((record) =>
        window.api.content.delete(record.id)
      )

      const deleteResponses = await Promise.all(deletePromises)
      const hasErrors = deleteResponses.some((response) => isApiError(response))

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
      console.warn(
        'clearAllContent not fully implemented - would need API method to get all content'
      )
      return true
    } catch (error) {
      console.error('Error clearing all content:', error)
      return false
    }
  },

  // Get content by touchpoint
  async getContentByTouchpoint(
    touchpoint: number
  ): Promise<GeneratedContentRecord[]> {
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
  },
}
