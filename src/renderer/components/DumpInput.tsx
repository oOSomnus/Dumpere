import { useState, useRef, KeyboardEvent, DragEvent, ClipboardEvent } from 'react'
import { FileChip } from './FileChip'
import { ProjectSelector } from './ProjectSelector'
import { TagInput } from './TagInput'
import { Project, Tag } from '../lib/types'
import { cn } from '../../lib/utils'

interface FileChipData {
  id: string
  name: string
  path: string  // Temp path before copy
}

interface DumpInputProps {
  onSubmit: (text: string, filePaths: string[], projectId: string | null, tagIds: string[]) => Promise<void>
  // Phase 2: Project support
  projects: Project[]
  activeProjectId: string | null
  onProjectSelect: (projectId: string | null) => void
  // Phase 2: Tag support
  allTags: Tag[]
  selectedTagIds: string[]
  onTagsChange: (tagIds: string[]) => void
  getAISuggestions: (text: string) => Tag[]
  onCreateTag: (name: string) => Promise<Tag>
  dumpText: string  // current text for AI suggestions
}

export function DumpInput({
  onSubmit,
  projects,
  activeProjectId,
  onProjectSelect,
  allTags,
  selectedTagIds,
  onTagsChange,
  getAISuggestions,
  onCreateTag,
  dumpText
}: DumpInputProps) {
  const [text, setText] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<FileChipData[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tagInputOpen, setTagInputOpen] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // D-05: Enter opens tag selection popup (if not already open)
    // Second Enter (after selecting tags) submits
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!tagInputOpen) {
        // First Enter: open tag popup
        setTagInputOpen(true)
      } else {
        // TagInput is open - user pressed Enter again, submit with tags
        await submit()
      }
    }
  }

  const submit = async () => {
    const hasContent = text.trim() || attachedFiles.length > 0
    if (!hasContent || isSubmitting) return

    setIsSubmitting(true)

    try {
      // D-06: Mixed content — text + multiple files
      // Pass projectId and tagIds to onSubmit
      await onSubmit(
        text.trim(),
        attachedFiles.map(f => f.path),
        activeProjectId,
        selectedTagIds
      )

      // D-07: Instant feedback — clear immediately (optimistic)
      setText('')
      setAttachedFiles([])
      setTagInputOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDrop = (e: DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const files = Array.from(e.dataTransfer.files)
    addFiles(files)
  }

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    // Handle paste of files (D-02 through D-05)
    const items = Array.from(e.clipboardData.items)
    const fileItems = items.filter(item => item.kind === 'file')

    if (fileItems.length > 0) {
      e.preventDefault()
      const files = fileItems.map(item => item.getAsFile()).filter(Boolean) as File[]
      addFiles(files)
    }
  }

  const addFiles = (files: File[]) => {
    const chips: FileChipData[] = files.map(f => ({
      id: crypto.randomUUID(),
      name: f.name,
      // Electron provides path property on dropped files
      path: (f as File & { path?: string }).path || ''
    })).filter(chip => chip.path) // Only add if path is available

    if (chips.length > 0) {
      setAttachedFiles(prev => [...prev, ...chips])
    }
  }

  const removeFile = (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id))
  }

  // When text changes, update dumpText for AI suggestions
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0',
        'border-t backdrop-blur',
        'transition-all duration-150'
      )}
      style={{
        backgroundColor: 'rgba(var(--background-rgb, 255 255 255), 0.95)',
        borderColor: 'var(--border)'
      }}
    >
      {/* TagInput popup — positioned above the input */}
      <TagInput
        open={tagInputOpen}
        onOpenChange={setTagInputOpen}
        selectedTagIds={selectedTagIds}
        onTagsChange={onTagsChange}
        allTags={allTags}
        getAISuggestions={getAISuggestions}
        onCreateTag={onCreateTag}
        dumpText={text}
      />

      {/* File chips row */}
      {attachedFiles.length > 0 && (
        <div
          className="flex gap-2 px-4 pt-2 overflow-x-auto"
          style={{ maxHeight: '80px' }}
        >
          {attachedFiles.map(file => (
            <FileChip
              key={file.id}
              name={file.name}
              onRemove={() => removeFile(file.id)}
            />
          ))}
        </div>
      )}

      {/* Input row with ProjectSelector */}
      <div className="flex items-center px-4" style={{ height: '48px' }}>
        {/* ProjectSelector — dropdown for project selection */}
        <ProjectSelector
          projects={projects}
          activeProjectId={activeProjectId}
          onSelect={onProjectSelect}
        />

        <textarea
          ref={inputRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
          onDrop={handleDrop}
          onPaste={handlePaste}
          placeholder="Dump something... (Enter to add tags)"
          disabled={isSubmitting}
          rows={1}
          className={cn(
            'flex-1 bg-transparent border-0 outline-none text-base resize-none',
            'placeholder:text-muted-foreground'
          )}
          style={{
            color: 'var(--foreground)',
            height: '48px'
          }}
        />

        {/* Submit indicator */}
        {isSubmitting && (
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Saving...
          </span>
        )}
      </div>
    </div>
  )
}
