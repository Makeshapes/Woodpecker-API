/**
 * Gmail-style plain text editor component for enhanced content editing
 * Story 1.5: Enhanced Content Editing Workflow with Plain Text UI
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle } from 'lucide-react'
import {
  type PlainTextContent,
  type LightValidationResult,
  validatePlainText,
} from '@/utils/contentConverter'

interface PlainTextEditorProps {
  content: PlainTextContent
  onChange: (field: keyof PlainTextContent, value: string) => void
  className?: string
}

interface FieldConfig {
  key: keyof PlainTextContent
  label: string
  description: string
  timeline: string
  isSingleLine: boolean
  placeholder: string
  maxLength?: number
  minLength?: number
}

const FIELD_CONFIGS: FieldConfig[] = [
  {
    key: 'snippet1',
    label: 'Email Subject',
    description: 'Day 1 - Initial outreach subject line',
    timeline: 'Day 1',
    isSingleLine: true,
    placeholder: 'Enter subject line (36-50 characters)...',
    minLength: 36,
    maxLength: 50,
  },
  {
    key: 'snippet2',
    label: 'Email Body',
    description: 'Day 1 - Initial outreach email body',
    timeline: 'Day 1',
    isSingleLine: false,
    placeholder: 'Enter email body...\n\nUse line breaks for paragraphs.',
  },
  {
    key: 'snippet3',
    label: 'LinkedIn Message',
    description: 'Day 2-3 - LinkedIn connection message',
    timeline: 'Day 2-3',
    isSingleLine: true,
    placeholder: 'Enter LinkedIn message (max 300 characters)...',
    maxLength: 300,
  },
  {
    key: 'snippet4',
    label: 'Bump Email',
    description: 'Day 7 - Follow-up email',
    timeline: 'Day 7',
    isSingleLine: false,
    placeholder: 'Enter bump email content...',
  },
  {
    key: 'snippet5',
    label: 'Follow-up Email',
    description: 'Day 12 - Second follow-up email',
    timeline: 'Day 12',
    isSingleLine: false,
    placeholder: 'Enter follow-up email content...',
  },
  {
    key: 'snippet6',
    label: 'Bump Email 2',
    description: 'Day 17 - Third follow-up email',
    timeline: 'Day 17',
    isSingleLine: false,
    placeholder: 'Enter second bump email content...',
  },
  {
    key: 'snippet7',
    label: 'Breakup Email',
    description: 'Day 25 - Final breakup email',
    timeline: 'Day 25',
    isSingleLine: false,
    placeholder: 'Enter breakup email content...',
  },
]

export function PlainTextEditor({
  content,
  onChange,
  className = '',
}: PlainTextEditorProps) {
  const [validation, setValidation] = useState<LightValidationResult>({
    isValid: true,
    errors: [],
  })

  // 🐛 DEBUG: Add tracking refs
  const renderCount = useRef(0)
  const lastCursorPosition = useRef<{[key: string]: number}>({})
  const lastProps = useRef<PlainTextEditorProps>()

  // 🐛 DEBUG: Track renders and prop changes
  useEffect(() => {
    renderCount.current++
    const propsChanged = lastProps.current ?
      JSON.stringify(lastProps.current.content) !== JSON.stringify(content) : true

    console.log(`🔄 [PlainTextEditor] Render #${renderCount.current}`, {
      propsChanged,
      contentKeys: Object.keys(content),
      contentLengths: Object.keys(content).reduce((acc, key) => {
        acc[key] = content[key as keyof PlainTextContent]?.length || 0
        return acc
      }, {} as Record<string, number>),
      timestamp: Date.now()
    })

    lastProps.current = { content, onChange, className }
  })

  // Handle field value change - updates parent state directly
  const handleFieldChange = useCallback(
    (field: keyof PlainTextContent, value: string, event?: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const input = event?.target
      const cursorPos = input?.selectionStart || 0

      console.log('⌨️ [PlainTextEditor] Field change:', {
        field,
        valueLength: value.length,
        cursorPosition: cursorPos,
        previousLength: content[field]?.length || 0,
        timestamp: Date.now()
      })

      // Store cursor position before state update
      lastCursorPosition.current[field] = cursorPos

      // Update parent state
      onChange(field, value)

      // 🐛 DEBUG: Try to restore cursor position after React update
      if (input) {
        setTimeout(() => {
          console.log('🎯 [PlainTextEditor] Attempting cursor restore:', {
            field,
            targetPosition: cursorPos,
            currentPosition: input.selectionStart,
            timestamp: Date.now()
          })

          if (input.setSelectionRange && document.activeElement === input) {
            input.setSelectionRange(cursorPos, cursorPos)
            console.log('✅ [PlainTextEditor] Cursor position restored to:', cursorPos)
          }
        }, 0)
      }
    },
    [onChange, content]
  )

  // Validate content and update validation state
  const validateContent = useCallback((newContent: PlainTextContent) => {
    const result = validatePlainText(newContent)
    setValidation(result)
    return result
  }, [])

  // Validate content whenever it changes
  useEffect(() => {
    validateContent(content)
  }, [content, validateContent])

  // Get validation error for specific field
  const getFieldError = useCallback(
    (field: string) => {
      return validation.errors.find((error) => error.field === field)
    },
    [validation.errors]
  )

  // Get character count info for field
  const getCharacterInfo = useCallback(
    (field: keyof PlainTextContent, config: FieldConfig) => {
      const value = content[field] || ''
      const length = value.length
      const error = getFieldError(field)

      if (config.minLength || config.maxLength) {
        let info = `${length}`
        if (config.minLength && config.maxLength) {
          info += ` / ${config.minLength}-${config.maxLength}`
        } else if (config.maxLength) {
          info += ` / ${config.maxLength}`
        }

        // Check for errors based on current content
        let isError = false
        isError =
          (config.minLength ? length < config.minLength : false) ||
          (config.maxLength ? length > config.maxLength : false) ||
          (error && error.currentLength !== undefined ? true : false)

        return { text: info, isError, length }
      }

      return { text: `${length}`, isError: false, length }
    },
    [content, getFieldError]
  )

  return (
    <div className={`space-y-4 ${className}`}>
      {FIELD_CONFIGS.map((config) => {
        const value = content[config.key] || ''
        const error = getFieldError(config.key)
        const charInfo = getCharacterInfo(config.key, config)

        return (
          <Card key={config.key} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">
                    {config.label}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {config.timeline}
                  </Badge>
                  {(config.minLength || config.maxLength) && (
                    <Badge
                      variant={charInfo.isError ? 'destructive' : 'outline'}
                      className="text-xs"
                    >
                      {charInfo.text}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {error && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {config.description}
              </p>
              {error && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {error.message}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {config.isSingleLine ? (
                <Input
                  value={value}
                  onChange={(e) =>
                    handleFieldChange(config.key, e.target.value, e)
                  }
                  placeholder={config.placeholder}
                  className={error ? 'border-destructive' : ''}
                  maxLength={config.maxLength}
                />
              ) : (
                <Textarea
                  value={value}
                  onChange={(e) =>
                    handleFieldChange(config.key, e.target.value, e)
                  }
                  placeholder={config.placeholder}
                  className={`min-h-[120px] resize-y ${error ? 'border-destructive' : ''}`}
                />
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Overall validation summary */}
      {!validation.isValid && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Content validation issues
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please fix the errors above before converting to JSON.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default PlainTextEditor
