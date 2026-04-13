import { useState, useRef, useCallback, useEffect, KeyboardEvent, DragEvent, ClipboardEvent } from 'react'
import { ResizeHandle } from './ResizeHandle'
import { TagInput } from './TagInput'
import type { Project, Tag } from '@/shared/types'
import { cn } from '@/shared/cn'
import { getElectronAPI } from '../lib/electron-api'
import { DumpAttachmentStrip } from './dump-input/DumpAttachmentStrip'
import { DumpComposer } from './dump-input/DumpComposer'
import { useI18n } from '@/renderer/i18n'

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
  // Panel resizing
  inputHeight?: number
  onInputHeightChange?: (height: number) => void
  leftOffset?: number
}

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
  inputHeight = 60,
  onInputHeightChange,
  leftOffset = 0,
}: DumpInputProps) {
  const api = getElectronAPI()
  const { t } = useI18n()
  const [text, setText] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<FileChipData[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tagInputOpen, setTagInputOpen] = useState(false)
  const [projectError, setProjectError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleInputResizeStart = (e: React.MouseEvent) => {
    if (!onInputHeightChange) return
    e.preventDefault()
    const startY = e.clientY
    const startHeight = inputHeight

    const clamp = (value: number, min: number, max: number) =>
      Math.min(Math.max(value, min), max)

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startY - moveEvent.clientY
      const newHeight = clamp(startHeight + delta, 60, 150)
      onInputHeightChange(newHeight)
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

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

  useEffect(() => {
    if (!activeProjectId && text) {
      setText('')
    }
  }, [activeProjectId, text])

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
          ? t('project.createBeforeDump')
          : t('project.assignBeforeDump')
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
      const tempPath = await api.files.createTempAttachment({
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
        left: `${leftOffset}px`,
        backgroundColor: 'rgba(var(--background-rgb, 255 255 255), 0.95)',
        borderColor: 'var(--border)',
        zIndex: 30,
      }}
    >
      {/* Resize handle at top edge for vertical resize */}
      {onInputHeightChange && (
        <ResizeHandle direction="vertical" onDragStart={handleInputResizeStart} />
      )}
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

      <DumpAttachmentStrip files={attachedFiles} onRemove={removeFile} />

      <DumpComposer
        inputRef={inputRef}
        text={text}
        onTextChange={handleTextChange}
        onKeyDown={handleKeyDown}
        onDrop={handleDrop}
        onPaste={handlePaste}
        isSubmitting={isSubmitting}
        inputHeight={inputHeight}
        projects={projects}
        activeProjectId={activeProjectId}
        onProjectSelect={handleProjectSelect}
        projectError={projectError}
      />

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
