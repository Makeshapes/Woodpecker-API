import React from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'

type RichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
}: RichTextEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = React.useState(false)
  const [htmlDraft, setHtmlDraft] = React.useState<string>(value || '')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        protocols: ['http', 'https', 'mailto'],
      }),
      Placeholder.configure({ placeholder: placeholder || 'Write here…' }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none min-h-[120px] p-3 rounded-md border bg-background',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  // Keep HTML draft in sync when value prop changes externally
  React.useEffect(() => {
    if (isHtmlMode) {
      setHtmlDraft(value || '')
    }
  }, [value, isHtmlMode])

  const toggleHtmlMode = () => {
    if (!editor) return
    if (!isHtmlMode) {
      // Going to HTML view
      setHtmlDraft(editor.getHTML())
      setIsHtmlMode(true)
    } else {
      // Returning to WYSIWYG
      editor.commands.setContent(htmlDraft, false)
      onChange(editor.getHTML())
      setIsHtmlMode(false)
    }
  }

  if (!editor) return null

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-1 border rounded-md bg-muted/30 p-1 mb-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
        >
          I
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
        >
          S
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setParagraph().run()}
          active={editor.isActive('paragraph')}
        >
          ¶
        </ToolbarButton>
        <div className="ml-auto" />
        <ToolbarButton onClick={toggleHtmlMode} active={isHtmlMode}>
          HTML
        </ToolbarButton>
      </div>
      {isHtmlMode ? (
        <textarea
          className="w-full min-h-[200px] font-mono text-sm p-3 rounded-md border bg-background"
          value={htmlDraft}
          onChange={(e) => {
            setHtmlDraft(e.target.value)
            onChange(e.target.value)
          }}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  )
}

function ToolbarButton({
  onClick,
  active,
  children,
}: {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
    >
      {children}
    </button>
  )
}
