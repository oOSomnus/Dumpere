import React, { useState } from 'react'
import { DumpEntry, mockElectronAPI } from '../lib/types'
import { formatRelativeTime } from '../lib/utils-time'
import { cn } from '../../lib/utils'
import { FileText, Image, Video, Music, File, X, Check } from 'lucide-react'
import * as Checkbox from '@radix-ui/react-checkbox'
import { ConfirmDialog } from './ConfirmDialog'

const getFileUrl = (path: string) =>
  typeof window !== 'undefined' && window.electronAPI
    ? window.electronAPI.getFileUrl(path)
    : mockElectronAPI.getFileUrl(path)

interface DumpCardProps {
  dump: DumpEntry
  onDelete: (id: string) => void
  onClick: () => void
  // Phase 2: project badge
  projectName?: string  // passed from parent to avoid hook dependency
  // Phase 2: tag chips
  tags?: Array<{id: string; name: string}>  // passed from parent
  // Phase 3: multi-select checkbox
  showCheckbox?: boolean      // Whether to show checkbox (default false)
  isSelected?: boolean        // Whether card is selected
  onSelectToggle?: (id: string) => void  // Called when checkbox clicked
  // Phase 3: search highlighting
  highlightedText?: React.ReactNode  // Pre-rendered highlighted text with <mark> tags
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <Image className="w-5 h-5" />
  if (mimeType.startsWith('video/')) return <Video className="w-5 h-5" />
  if (mimeType.startsWith('audio/')) return <Music className="w-5 h-5" />
  if (mimeType.startsWith('text/')) return <FileText className="w-5 h-5" />
  return <File className="w-5 h-5" />
}

export function DumpCard({
  dump,
  onDelete,
  onClick,
  projectName,
  tags = [],
  showCheckbox = false,
  isSelected = false,
  onSelectToggle,
  highlightedText,
}: DumpCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const timestamp = formatRelativeTime(dump.createdAt)

  // Get first image file for thumbnail
  const thumbnail = dump.files.find(f => f.mimeType.startsWith('image/'))

  // Phase 2: Visible tag chips (max 3, +N overflow)
  const MAX_VISIBLE_TAGS = 3
  const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS)
  const overflowCount = tags.length - MAX_VISIBLE_TAGS

  return (
    <>
    <div
      className={cn(
        'relative rounded-[0.625rem] p-4 cursor-pointer transition-all duration-150',
        'bg-secondary text-secondary-foreground',
        isHovered ? 'shadow-lg -translate-y-0.5' : 'shadow-sm'
      )}
      style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Delete button — top right, only on hover */}
      <button
        className={cn(
          'absolute top-2 right-2 p-1 rounded opacity-0 transition-opacity duration-150',
          isHovered ? 'opacity-100' : 'opacity-0'
        )}
        style={{ color: 'var(--destructive)' }}
        onClick={(e) => {
          e.stopPropagation()
          setShowDeleteConfirm(true)
        }}
      >
        <X className="w-4 h-4" />
      </button>

      {/* Phase 3: Checkbox — top left, visible on hover */}
      {showCheckbox && (
        <div
          className={cn(
            'absolute top-2 left-2 transition-opacity duration-150',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
          onClick={(e) => {
            e.stopPropagation()
            onSelectToggle?.(dump.id)
          }}
        >
          <Checkbox.Root
            checked={isSelected}
            className="w-4 h-4 rounded border"
            style={{
              backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
              borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
            }}
          >
            <Checkbox.Indicator>
              <Check className="w-3 h-3" style={{ color: 'var(--accent-foreground)' }} />
            </Checkbox.Indicator>
          </Checkbox.Root>
        </div>
      )}

      {/* Content */}
      <div className="space-y-2">
        {/* Thumbnail or file icons */}
        {thumbnail ? (
          <div className="w-full h-24 rounded overflow-hidden" style={{ backgroundColor: 'var(--accent)' }}>
            <img
              src={getFileUrl(thumbnail.storedPath)}
              alt={thumbnail.originalName}
              className="w-full h-full object-cover"
            />
          </div>
        ) : dump.files.length > 0 ? (
          <div className="flex gap-1 flex-wrap">
            {dump.files.slice(0, 4).map(file => (
              <div
                key={file.id}
                className="p-1.5 rounded"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                <FileIcon mimeType={file.mimeType} />
              </div>
            ))}
            {dump.files.length > 4 && (
              <span className="text-xs self-center" style={{ color: 'var(--muted-foreground)' }}>
                +{dump.files.length - 4}
              </span>
            )}
          </div>
        ) : null}

        {/* Text snippet — 1-2 lines, truncated */}
        {/* When highlightedText is provided (search results), render with <mark> tags */}
        {dump.text && (
          <p
            className="text-sm line-clamp-2"
            style={{ color: 'var(--foreground)', lineHeight: 1.5 }}
          >
            {highlightedText ?? dump.text}
          </p>
        )}

        {/* Timestamp + Project badge row */}
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className="text-xs"
            style={{ color: 'var(--muted-foreground)' }}
          >
            {timestamp}
          </p>

          {/* Phase 2: Project badge */}
          {projectName && (
            <span
              className="px-2 py-0.5 rounded text-xs"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--foreground)'
              }}
            >
              {projectName}
            </span>
          )}
        </div>

        {/* Phase 2: Tag chips row */}
        {tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {visibleTags.map(tag => (
              <span
                key={tag.id}
                className="px-2 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--foreground)'
                }}
              >
                {tag.name}
              </span>
            ))}
            {overflowCount > 0 && (
              <span
                className="px-2 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--muted-foreground)'
                }}
              >
                +{overflowCount}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete this dump?"
        description="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          onDelete(dump.id)
          setShowDeleteConfirm(false)
        }}
        destructive
      />
    </>
  )
}
