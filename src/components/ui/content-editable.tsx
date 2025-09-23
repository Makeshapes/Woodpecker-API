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
  const isMountedRef = useRef(false)

  // Handle initial content and subsequent updates
  useEffect(() => {
    if (!isMountedRef.current) {
      // First mount - always set initial content
      if (divRef.current) {
        divRef.current.innerHTML = value
        lastValueRef.current = value
        console.log('🚀 [ContentEditable] Initial content set on mount:', value.length, 'chars')
      }
      isMountedRef.current = true
    } else {
      // Subsequent updates - only update if not focused and value actually changed
      if (divRef.current && value !== lastValueRef.current) {
        const isActive = document.activeElement === divRef.current

        console.log('🔄 [ContentEditable] Value changed after mount:', {
          isActive,
          valueLength: value.length,
          previousLength: lastValueRef.current.length
        })

        if (!isActive) {
          divRef.current.innerHTML = value
          lastValueRef.current = value
          console.log('✅ [ContentEditable] Content updated (not focused)')
        } else {
          console.log('⏭️ [ContentEditable] Skipping content update (element focused)')
        }
      }
    }
  }, [value])

  const handleInput = useCallback(() => {
    if (divRef.current) {
      const selection = window.getSelection()
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null
      const cursorOffset = range?.startOffset || 0

      const newValue = divRef.current.innerHTML
      console.log('⌨️ [ContentEditable] Input event:', {
        contentLength: newValue.length,
        cursorOffset,
        timestamp: Date.now()
      })

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
        'min-h-[200px] max-h-[400px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
        'overflow-y-auto scroll-smooth',
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