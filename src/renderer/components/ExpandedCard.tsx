import { useEffect, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import { DumpEntry, Project, Tag } from '../lib/types'
import { formatRelativeTime } from '../lib/utils-time'
import { cn } from '../../lib/utils'
import { X, Download, Image, Video, Music, File, Check, ChevronDown, Copy, NotebookPen } from 'lucide-react'
import { useFileUrl } from '../hooks/useFileUrl'

function formatDumpAsMarkdown(dump: DumpEntry): string {
  let md = `${dump.text || ''}\n`

  // Add file references as markdown
  dump.files.forEach(file => {
    md += `\n![${file.originalName}](./assets/${file.id}_${file.originalName})`
  })

  return md
}

interface ExpandedCardProps {
  dump: DumpEntry | null
  onClose: () => void
  // Phase 2: project support
  projects: Project[]
  tags: Tag[]
  onProjectChange: (dumpId: string, projectId: string | null) => void
  onTagsChange: (dumpId: string, tagIds: string[]) => void
  onQuoteToWorkpad?: (dump: DumpEntry) => Promise<void> | void
}

function getElectronAPI() {
  return typeof window !== 'undefined' && window.electronAPI
    ? window.electronAPI
    : null
}

function MediaPreview({ file }: { file: { storedPath: string; mimeType: string; originalName: string } }) {
  const fileUrl = useFileUrl(file.storedPath)
  const handleOpenFile = async () => {
    const api = getElectronAPI()
    if (!api) return

    try {
      await api.openFile(file.storedPath)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not open file'
      alert(message)
    }
  }

  if (!fileUrl) {
    return (
      <div
        className="flex items-center justify-center rounded border p-6"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--secondary)' }}
      >
        <Image className="w-8 h-8" style={{ color: 'var(--muted-foreground)' }} />
      </div>
    )
  }

  if (file.mimeType.startsWith('image/')) {
    return (
      <button
        type="button"
        onClick={() => void handleOpenFile()}
        className="block w-full text-left"
        aria-label={`Open ${file.originalName}`}
        title="Open with default app"
      >
        <img
          src={fileUrl}
          alt={file.originalName}
          className="max-w-full max-h-96 rounded object-contain cursor-pointer hover:opacity-90 transition-opacity"
        />
      </button>
    )
  }

  if (file.mimeType.startsWith('video/')) {
    return (
      <video
        src={fileUrl}
        controls
        className="max-w-full max-h-96 rounded"
      />
    )
  }

  if (file.mimeType.startsWith('audio/')) {
    return (
      <audio
        src={fileUrl}
        controls
        className="w-full"
      />
    )
  }

  return null
}

function FileAttachment({ file }: { file: { storedPath: string; mimeType: string; originalName: string; size: number } }) {
  const sizeKB = Math.round(file.size / 1024)
  const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`
  const handleOpenFile = async () => {
    const api = getElectronAPI()
    if (!api) return

    try {
      await api.openFile(file.storedPath)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not open file'
      alert(message)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleOpenFile()}
      className={cn(
        'flex w-full items-center gap-2 p-3 rounded-md transition-colors text-left',
        'border hover:border-primary'
      )}
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--secondary)' }}
      aria-label={`Open ${file.originalName}`}
      title="Open with default app"
    >
      <File className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: 'var(--foreground)' }}>{file.originalName}</p>
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{sizeStr}</p>
      </div>
      <Download className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
    </button>
  )
}

export function ExpandedCard({ dump, onClose, projects, tags, onProjectChange, onTagsChange, onQuoteToWorkpad }: ExpandedCardProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!dump) return null

  const isMediaFile = (f: { mimeType: string }) =>
    f.mimeType.startsWith('image/') || f.mimeType.startsWith('video/') || f.mimeType.startsWith('audio/')

  const mediaFiles = dump.files.filter(isMediaFile)
  const otherFiles = dump.files.filter(f => !isMediaFile(f))

  // Find tag names for display
  const currentTags = dump.tags.map(tagId => tags.find(t => t.id === tagId)).filter(Boolean) as Tag[]

  const handleProjectSelect = (projectId: string | null) => {
    onProjectChange(dump.id, projectId)
  }

  const handleTagToggle = (tagId: string) => {
    const hasTag = dump.tags.includes(tagId)
    const newTags = hasTag
      ? dump.tags.filter(id => id !== tagId)
      : [...dump.tags, tagId]
    onTagsChange(dump.id, newTags)
  }

  return (
    <Dialog.Root open={!!dump} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          ref={overlayRef}
          className="fixed inset-0 bg-black/50 animate-in fade-in duration-150"
          onClick={onClose}
        />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-2xl max-h-[85vh] overflow-y-auto',
            'rounded-lg p-6 shadow-xl',
            'focus:outline-none'
          )}
          style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-2">
                <p
                  className="text-xs"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {formatRelativeTime(dump.createdAt)}
                </p>

                {/* Phase 2: Project display/editor */}
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Project:</span>
                  <Select.Root
                    value={dump.projectId ?? undefined}
                    onValueChange={handleProjectSelect}
                  >
                    <Select.Trigger
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded text-sm',
                        'border transition-colors',
                        'hover:bg-accent'
                      )}
                      style={{
                        backgroundColor: 'var(--secondary)',
                        borderColor: 'var(--border)',
                        color: 'var(--foreground)'
                      }}
                    >
                      <Select.Value placeholder="No Project" />
                      <ChevronDown className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content
                        className="z-50 rounded-md shadow-lg p-1"
                        style={{
                          backgroundColor: 'var(--popover)',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <Select.Viewport>
                          {projects.map(project => (
                            <Select.Item key={project.id} value={project.id}>
                              <Select.ItemText>{project.name}</Select.ItemText>
                              <Select.ItemIndicator>
                                <Check className="w-4 h-4" />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>

                {/* Phase 2: Tags display/editor */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Tags:</span>
                  <div className="flex gap-1 flex-wrap">
                    {currentTags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => handleTagToggle(tag.id)}
                        className="px-2 py-0.5 rounded text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
                        style={{
                          backgroundColor: 'var(--accent)',
                          color: 'var(--foreground)'
                        }}
                        title="Click to remove"
                      >
                        {tag.name}
                        <X className="w-3 h-3" />
                      </button>
                    ))}
                    {/* Quick add tag buttons */}
                    {tags.filter(t => !dump.tags.includes(t.id)).slice(0, 3).map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => handleTagToggle(tag.id)}
                        className="px-2 py-0.5 rounded text-xs border transition-colors hover:bg-accent"
                        style={{
                          backgroundColor: 'transparent',
                          borderColor: 'var(--border)',
                          color: 'var(--muted-foreground)'
                        }}
                        title="Click to add"
                      >
                        + {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {onQuoteToWorkpad && (
                  <button
                    onClick={() => {
                      void onQuoteToWorkpad(dump)
                    }}
                    className="p-1 rounded hover:bg-accent transition-colors"
                    style={{ color: 'var(--foreground)' }}
                    aria-label="Insert dump reference"
                    title="Insert dump reference"
                  >
                    <NotebookPen className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (dump) {
                      const markdown = formatDumpAsMarkdown(dump)
                      await window.electronAPI.clipboardWrite(markdown)
                      alert('Copied to clipboard')
                    }
                  }}
                  className="p-1 rounded hover:bg-accent transition-colors"
                  style={{ color: 'var(--foreground)' }}
                  aria-label="Copy to clipboard"
                >
                  <Copy className="w-5 h-5" />
                </button>
                <Dialog.Close asChild>
                  <button
                    className="p-1 rounded hover:bg-accent transition-colors"
                    style={{ color: 'var(--foreground)' }}
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>
            </div>

            {/* Text content — full, not truncated */}
            {dump.text && (
              <p
                className="text-base whitespace-pre-wrap"
                style={{ color: 'var(--foreground)', lineHeight: 1.6 }}
              >
                {dump.text}
              </p>
            )}

            {/* Media files — inline preview */}
            {mediaFiles.length > 0 && (
              <div className="space-y-3">
                {mediaFiles.map(file => (
                  <MediaPreview key={file.id} file={file} />
                ))}
              </div>
            )}

            {/* Other files — downloadable attachments */}
            {otherFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
                  Attachments
                </p>
                {otherFiles.map(file => (
                  <FileAttachment key={file.id} file={file} />
                ))}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
