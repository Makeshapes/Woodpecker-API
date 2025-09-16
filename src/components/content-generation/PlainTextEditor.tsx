/**
 * Gmail-style plain text editor component for enhanced content editing
 * Story 1.5: Enhanced Content Editing Workflow with Plain Text UI
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Edit, Save, X, AlertCircle } from 'lucide-react'
import {
  type PlainTextContent,
  type LightValidationResult,
  validatePlainText,
} from '@/utils/contentConverter'

interface PlainTextEditorProps {
  content: PlainTextContent
  onChange: (content: PlainTextContent) => void
  editingField: string | null
  onEditField: (field: string | null) => void
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
  editingField,
  onEditField,
  className = '',
}: PlainTextEditorProps) {
  const [validation, setValidation] = useState<LightValidationResult>({
    isValid: true,
    errors: [],
  })

  // Ref for auto-resizing the multiline editor
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Local state for editing - only updates parent on save
  const [editingValue, setEditingValue] = useState<string>('')

  // Debug: Track when content prop changes
  useEffect(() => {
    console.log('🔄 [PlainTextEditor] Content prop changed:', content)
  }, [content])

  // Validate content and update validation state
  const validateContent = useCallback((newContent: PlainTextContent) => {
    const result = validatePlainText(newContent)
    setValidation(result)
    return result
  }, [])

  // Handle field value change - only updates local state
  const handleFieldChange = useCallback(
    (field: keyof PlainTextContent, value: string) => {
      setEditingValue(value)
      // Validate the potential new content without saving it
      const potentialContent = { ...content, [field]: value }
      validateContent(potentialContent)
    },
    [content, validateContent]
  )

  // Auto-resize the textarea when editing text changes
  useEffect(() => {
    if (textareaRef.current) {
      const el = textareaRef.current
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 1200) + 'px'
    }
  }, [editingField, editingValue])

  // Handle save editing - now updates parent state
  const handleSave = useCallback(
    (field: keyof PlainTextContent) => {
      console.log(
        '💾 [PlainTextEditor] Saving field:',
        field,
        'with value:',
        editingValue
      )

      // For save operation, we only validate the current field, not the entire form
      // This allows users to save individual fields even if other fields are incomplete
      const fieldConfig = FIELD_CONFIGS.find((config) => config.key === field)
      let canSave = true

      if (fieldConfig) {
        // Check field-specific validation
        if (
          fieldConfig.minLength &&
          editingValue.length < fieldConfig.minLength
        ) {
          canSave = false
          console.log(
            '❌ [PlainTextEditor] Field too short:',
            editingValue.length,
            'min:',
            fieldConfig.minLength
          )
        }
        if (
          fieldConfig.maxLength &&
          editingValue.length > fieldConfig.maxLength
        ) {
          canSave = false
          console.log(
            '❌ [PlainTextEditor] Field too long:',
            editingValue.length,
            'max:',
            fieldConfig.maxLength
          )
        }
        if (fieldConfig.isSingleLine && editingValue.includes('\n')) {
          canSave = false
          console.log(
            '❌ [PlainTextEditor] Single line field contains line breaks'
          )
        }
      }

      if (canSave) {
        // Build new content with the current editing value
        const newContent = { ...content, [field]: editingValue }
        console.log('💾 [PlainTextEditor] New content object:', newContent)

        // Update the parent with new content
        onChange(newContent)
        console.log(
          '✅ [PlainTextEditor] Parent onChange called with new content'
        )

        // Exit editing mode immediately - the content prop will update and trigger a re-render
        onEditField(null)
        setEditingValue('')
        console.log(
          '✅ [PlainTextEditor] Save completed successfully, editing mode exited'
        )
      } else {
        console.log('❌ [PlainTextEditor] Field validation failed, cannot save')
      }
    },
    [content, editingValue, onChange, onEditField]
  )

  // Handle cancel editing - resets local state
  const handleCancel = useCallback(() => {
    onEditField(null)
    setEditingValue('')
    // Re-validate current content
    validateContent(content)
  }, [onEditField, content, validateContent])

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
      const isEditing = editingField === field
      const value = isEditing ? editingValue : content[field] || ''
      const length = value.length
      const error = getFieldError(field)

      if (config.minLength || config.maxLength) {
        let info = `${length}`
        if (config.minLength && config.maxLength) {
          info += ` / ${config.minLength}-${config.maxLength}`
        } else if (config.maxLength) {
          info += ` / ${config.maxLength}`
        }

        const isError = error && error.currentLength !== undefined
        return { text: info, isError, length }
      }

      return { text: `${length}`, isError: false, length }
    },
    [content, editingField, editingValue, getFieldError]
  )

  return (
    <div className={`space-y-4 ${className}`}>
      {FIELD_CONFIGS.map((config) => {
        const value = content[config.key] || ''
        const isEditing = editingField === config.key
        const displayValue = isEditing ? editingValue : value
        const error = getFieldError(config.key)
        const charInfo = getCharacterInfo(config.key, config)

        // When starting to edit, initialize the editing value
        const handleStartEdit = () => {
          setEditingValue(value)
          onEditField(config.key)
        }

        // Check if current editing value is valid for saving
        const canSaveField =
          !isEditing ||
          ((!config.minLength || editingValue.length >= config.minLength) &&
            (!config.maxLength || editingValue.length <= config.maxLength) &&
            (!config.isSingleLine || !editingValue.includes('\n')))

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
                  {!isEditing && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleStartEdit}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
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
              {isEditing ? (
                <div className="space-y-3">
                  {config.isSingleLine ? (
                    <Input
                      value={displayValue}
                      onChange={(e) =>
                        handleFieldChange(config.key, e.target.value)
                      }
                      placeholder={config.placeholder}
                      className={error ? 'border-destructive' : ''}
                      maxLength={config.maxLength}
                    />
                  ) : (
                    <Textarea
                      value={displayValue}
                      onChange={(e) =>
                        handleFieldChange(config.key, e.target.value)
                      }
                      placeholder={config.placeholder}
                      className={`min-h-[240px] md:min-h-[320px] resize-y ${error ? 'border-destructive' : ''}`}
                      ref={textareaRef}
                      style={{
                        lineHeight: '1.5',
                        fontFamily: 'inherit',
                        overflow: 'hidden',
                      }}
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSave(config.key)}
                      disabled={!canSaveField}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="min-h-[60px] p-3 rounded-md border bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={handleStartEdit}
                >
                  {value ? (
                    <div className="whitespace-pre-wrap text-sm">{value}</div>
                  ) : (
                    <div className="text-muted-foreground text-sm italic">
                      Click to add {config.label.toLowerCase()}...
                    </div>
                  )}
                </div>
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
