/**
 * Conversion button component for "Approve Content" functionality
 * Story 1.5: Enhanced Content Editing Workflow with Plain Text UI
 */

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileCode, AlertCircle, CheckCircle } from 'lucide-react'
import {
  type PlainTextContent,
  convertToHtmlContent,
  validatePlainText,
} from '@/utils/contentConverter'
import { TemplateService } from '@/services/templateService'
import type { ClaudeResponse } from '@/services/claudeService'

interface ConversionButtonProps {
  plainTextContent: PlainTextContent
  leadData: any
  onConversionComplete: (htmlContent: ClaudeResponse) => void
  onShowJson: (show: boolean) => void
  onStatusChange?: () => void
  disabled?: boolean
  className?: string
}

interface ConversionState {
  isConverting: boolean
  isConverted: boolean
  conversionError: string | null
  htmlValidationErrors: string[]
}

export function ConversionButton({
  plainTextContent,
  leadData,
  onConversionComplete,
  onShowJson,
  onStatusChange,
  disabled = false,
  className = '',
}: ConversionButtonProps) {
  const [state, setState] = useState<ConversionState>({
    isConverting: false,
    isConverted: false,
    conversionError: null,
    htmlValidationErrors: [],
  })

  const handlePrepareJson = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isConverting: true,
      conversionError: null,
      htmlValidationErrors: [],
    }))

    try {
      // Step 1: Validate plain text content first
      console.log('🔍 [ConversionButton] Validating plain text content...')
      const plainTextValidation = validatePlainText(plainTextContent)

      if (!plainTextValidation.isValid) {
        const errorMessages = plainTextValidation.errors.map(
          (error) => error.message
        )
        setState((prev) => ({
          ...prev,
          isConverting: false,
          conversionError:
            'Please fix the content validation errors before converting to JSON.',
          htmlValidationErrors: errorMessages,
        }))
        return
      }

      // Step 2: Convert plain text to HTML format
      console.log('🔄 [ConversionButton] Converting plain text to HTML...')
      const htmlContent = convertToHtmlContent(plainTextContent, leadData)
      console.log('✅ [ConversionButton] Conversion completed')

      // Step 3: Run full HTML validation using existing templateService logic
      console.log('🔍 [ConversionButton] Validating HTML content...')
      const templateService = new TemplateService()
      const isHtmlValid = templateService.validateGeneratedContent(
        htmlContent,
        'email-sequence'
      )

      if (!isHtmlValid) {
        console.error('❌ [ConversionButton] HTML validation failed')
        setState((prev) => ({
          ...prev,
          isConverting: false,
          conversionError:
            'Generated HTML content does not meet validation criteria. Please check your content format.',
          htmlValidationErrors: [
            'HTML format validation failed',
            'Please ensure all required content is provided',
            'Subject line should be 36-50 characters (guideline)',
            'LinkedIn message should be ≤300 characters (guideline)',
            'Email content must not be empty',
          ],
        }))
        return
      }

      // Step 4: Success - update states
      console.log('✅ [ConversionButton] HTML validation passed')
      setState((prev) => ({
        ...prev,
        isConverting: false,
        isConverted: true,
        conversionError: null,
        htmlValidationErrors: [],
      }))

      // Notify parent components
      onConversionComplete(htmlContent as ClaudeResponse)
      onShowJson(true)
      onStatusChange?.()
    } catch (error) {
      console.error('❌ [ConversionButton] Conversion failed:', error)
      setState((prev) => ({
        ...prev,
        isConverting: false,
        conversionError:
          error instanceof Error ? error.message : 'Conversion failed',
        htmlValidationErrors: ['Unexpected error during conversion'],
      }))
    }
  }, [plainTextContent, leadData, onConversionComplete, onShowJson])

  const handleReset = useCallback(() => {
    setState({
      isConverting: false,
      isConverted: false,
      conversionError: null,
      htmlValidationErrors: [],
    })
    onShowJson(false)
  }, [onShowJson])

  const isDisabled = disabled || state.isConverting

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Conversion Button */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Approve Content
            </CardTitle>
            {state.isConverted && (
              <Badge variant="secondary" className="text-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Approved
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {state.isConverted
                ? 'Your content has been approved and converted to HTML format.'
                : 'Approve and convert your plain text content to HTML format. This will validate all content and prepare the JSON output.'}
            </p>

            <div className="flex items-center gap-3">
              <Button
                onClick={state.isConverted ? handleReset : handlePrepareJson}
                disabled={isDisabled}
                size="lg"
                variant={state.isConverted ? 'outline' : 'default'}
              >
                {state.isConverting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {state.isConverted ? (
                  <>
                    <FileCode className="h-4 w-4 mr-2" />
                    Edit Content
                  </>
                ) : (
                  <>
                    <FileCode className="h-4 w-4 mr-2" />
                    Approve Content
                  </>
                )}
              </Button>

              {state.isConverted && (
                <Badge variant="outline" className="text-green-600">
                  Content Approved
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {state.conversionError && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">
                  Conversion Failed
                </p>
                <p className="text-sm text-muted-foreground">
                  {state.conversionError}
                </p>
                {state.htmlValidationErrors.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Issues to fix:
                    </p>
                    <ul className="space-y-1">
                      {state.htmlValidationErrors.map((error, index) => (
                        <li
                          key={index}
                          className="text-xs text-destructive flex items-center gap-1"
                        >
                          <div className="h-1 w-1 rounded-full bg-destructive flex-shrink-0 mt-1.5" />
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {state.isConverted && !state.conversionError && (
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Conversion Successful
                </p>
                <p className="text-xs text-green-700">
                  Your content has been approved and converted to HTML format.
                  The Generated Content JSON is now available below.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ConversionButton
