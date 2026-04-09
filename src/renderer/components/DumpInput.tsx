import { useState, useRef, useCallback, useEffect, KeyboardEvent, DragEvent, ClipboardEvent } from 'react'
import { FileChip } from './FileChip'
import { ProjectSelector } from './ProjectSelector'
import { TagInput } from './TagInput'
import { Project, Tag, mockElectronAPI } from '../lib/types'
import { cn } from '../../lib/utils'

interface FileChipData {
  id: string
  name: string
  path: string  // Temp path before copy
}

interface DumpInputProps {
  onSubmit: (text: string, filePaths: string[], projectId: string | null, tagIds: string[]) => Promise<void>
  shouldAutoFocus?: boolean
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
}

const api = typeof window !== 'undefined' && window.electronAPI
  ? window.electronAPI
  : mockElectronAPI

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
}

function getFallbackFileName(file: File): string {
  if (file.name.trim()) {
    return file.name.trim()
  }

  const ext = MIME_EXTENSION_MAP[file.type] || 'bin'
  const prefix = file.type.startsWith('image/') ? 'pasted-image' : 'pasted-file'
  return `${prefix}.${ext}`
}

export function DumpInput({
  onSubmit,
  shouldAutoFocus = true,
  projects,
  activeProjectId,
  onProjectSelect,
  allTags,
  selectedTagIds,
  onTagsChange,
  getAISuggestions,
  onCreateTag,
}: DumpInputProps) {
  const [text, setText] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<FileChipData[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tagInputOpen, setTagInputOpen] = useState(false)
  const [projectError, setProjectError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const focusInput = useCallback(() => {
    if (!shouldAutoFocus || tagInputOpen || isSubmitting) return
    if (typeof document !== 'undefined' && document.querySelector('[role="dialog"]')) return
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }, [isSubmitting, shouldAutoFocus, tagInputOpen])

  useEffect(() => {
    focusInput()
  }, [focusInput])

  useEffect(() => {
    const handleWindowFocus = () => focusInput()
    window.addEventListener('focus', handleWindowFocus)
    return () => window.removeEventListener('focus', handleWindowFocus)
  }, [focusInput])

  useEffect(() => {
    if (activeProjectId) {
      setProjectError(null)
    }
  }, [activeProjectId])

  const handleKeyDown = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()

      if (tagInputOpen) {
        void submit()
        return
      }

      setTagInputOpen(true)
    }
  }

  const submit = async () => {
    const hasContent = text.trim() || attachedFiles.length > 0
    if (!hasContent || isSubmitting) return
    if (!activeProjectId) {
      setProjectError(
        projects.length === 0
          ? 'Create a project before saving a dump.'
          : 'Assign a project before saving a dump.'
      )
      return
    }

    setIsSubmitting(true)
    let shouldRestoreFocus = false

    try {
      await onSubmit(
        text.trim(),
        attachedFiles.map(f => f.path),
        activeProjectId,
        selectedTagIds
      )

      setText('')
      setAttachedFiles([])
      setTagInputOpen(false)
      shouldRestoreFocus = true
    } finally {
      setIsSubmitting(false)
      if (shouldRestoreFocus) {
        window.requestAnimationFrame(() => {
          if (typeof document !== 'undefined' && document.querySelector('[role="dialog"]')) return
          inputRef.current?.focus()
        })
      }
    }
  }

  const handleDrop = (e: DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const files = Array.from(e.dataTransfer.files)
    void addFiles(files)
  }

  const handlePaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    // Handle paste of files (D-02 through D-05)
    const items = Array.from(e.clipboardData.items)
    const fileItems = items.filter(item => item.kind === 'file')

    if (fileItems.length > 0) {
      e.preventDefault()
      const files = fileItems.map(item => item.getAsFile()).filter(Boolean) as File[]
      await addFiles(files)
    }
  }

  const addFiles = async (files: File[]) => {
    const chips = await Promise.all(files.map(async (file) => {
      const name = getFallbackFileName(file)
      const existingPath = (file as File & { path?: string }).path || ''

      if (existingPath) {
        return {
          id: crypto.randomUUID(),
          name,
          path: existingPath
        } satisfies FileChipData
      }

      const data = await file.arrayBuffer()
      const tempPath = await api.createTempAttachment({
        name,
        mimeType: file.type,
        data
      })

      return {
        id: crypto.randomUUID(),
        name,
        path: tempPath
      } satisfies FileChipData
    }))

    if (chips.length > 0) {
      setAttachedFiles(prev => [...prev, ...chips])
    }
  }

  const removeFile = (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id))
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
  }

  const handleTagOpenChange = (open: boolean) => {
    setTagInputOpen(open)
    if (!open) {
      focusInput()
    }
  }

  const handleProjectSelect = (projectId: string | null) => {
    setProjectError(null)
    onProjectSelect(projectId)
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
        onOpenChange={handleTagOpenChange}
        onSubmit={submit}
        onReturnFocus={focusInput}
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
          onSelect={handleProjectSelect}
          allowAllProjects={false}
          emptyLabel={projects.length === 0 ? 'No Projects' : 'Assign Project'}
          hasError={!!projectError}
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

      {projectError && (
        <div
          className="px-4 pb-3 text-xs"
          style={{ color: 'var(--destructive)' }}
        >
          {projectError}
        </div>
      )}
    </div>
  )
}
