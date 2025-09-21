import React, { useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface ContentEditableProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  disabled?: boolean
  'aria-label'?: string
}

/**
 * ContentEditable component for direct HTML editing
 * Replaces textarea to allow WYSIWYG editing of HTML content
 */
export const ContentEditable: React.FC<ContentEditableProps> = ({
  value,
  onChange,
  className,
  placeholder,
  disabled = false,
  'aria-label': ariaLabel,
}) => {
  const divRef = useRef<HTMLDivElement>(null)
  const lastValueRef = useRef(value)

  // Update content when value prop changes (but not due to our own edits)
  useEffect(() => {
    if (divRef.current && value !== lastValueRef.current) {
      const selection = window.getSelection()
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null
      const isSelectionInDiv = range && divRef.current.contains(range.commonAncestorContainer)

      // Only update if the div doesn't have focus or selection
      if (!isSelectionInDiv || document.activeElement !== divRef.current) {
        divRef.current.innerHTML = value
        lastValueRef.current = value
      }
    }
  }, [value])

  const handleInput = useCallback(() => {
    if (divRef.current) {
      const newValue = divRef.current.innerHTML
      lastValueRef.current = newValue
      onChange(newValue)
    }
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Allow some basic formatting shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault()
          document.execCommand('bold')
          break
        case 'i':
          e.preventDefault()
          document.execCommand('italic')
          break
        case 'z':
          // Allow undo/redo
          break
        default:
          // For other shortcuts, let them through
          break
      }
    }
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')

    // Insert plain text and let the component handle HTML conversion
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.deleteContents()
      range.insertNode(document.createTextNode(text))
      range.collapse(false)
      selection.removeAllRanges()
      selection.addRange(range)
    }

    handleInput()
  }, [handleInput])

  return (
    <div
      ref={divRef}
      contentEditable={!disabled}
      className={cn(
        'min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // Email-accurate spacing - minimal gaps between paragraphs
        '[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-1',
        '[&_li]:my-0 [&_li]:leading-normal',
        // Divs represent paragraphs - use small spacing to match email
        '[&_div]:my-1 [&_div:first-child]:mt-0 [&_div:last-child]:mb-0',
        // Handle the spacing divs our converter creates
        '[&_div:has(br:only-child)]:my-2 [&_div:has(br:only-child)]:h-2',
        // Remove prose styles that add too much spacing
        '[&_p]:my-1 [&_h1]:my-1 [&_h2]:my-1 [&_h3]:my-1',
        className
      )}
      dangerouslySetInnerHTML={{ __html: value }}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      aria-label={ariaLabel}
      data-placeholder={placeholder}
      style={{
        ...((!value || value.trim() === '') && placeholder ? {
          '::before': {
            content: `"${placeholder}"`,
            color: 'rgb(156 163 175)',
            position: 'absolute',
            pointerEvents: 'none',
          }
        } : {})
      }}
    />
  )
}

export default ContentEditable