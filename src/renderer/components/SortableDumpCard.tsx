import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { DumpEntry } from '../lib/types'
import { DumpCard } from './DumpCard'
import { cn } from '../../lib/utils'

interface SortableDumpCardProps {
  dump: DumpEntry
  onDelete: (id: string) => Promise<void> | void
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void
  showCheckbox?: boolean
  isSelected?: boolean
  onSelectToggle?: (id: string) => void
  highlightedText?: React.ReactNode
}

export function SortableDumpCard({
  dump,
  onDelete,
  onClick,
  showCheckbox,
  isSelected,
  onSelectToggle,
  highlightedText,
}: SortableDumpCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: dump.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto'
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative',
        isDragging && 'shadow-lg rounded-[0.625rem]'
      )}
    >
      {/* Drag handle - 6-dot grip icon in top-right, appears on hover */}
      <div
        className={cn(
          'absolute top-2 right-10 z-10 p-1 cursor-grab opacity-0 transition-opacity duration-150',
          'hover:opacity-100',
          isDragging && 'opacity-100 cursor-grabbing'
        )}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
      </div>

      {/* Drag overlay styling */}
      {isDragging && (
        <div
          className="absolute inset-0 rounded-[0.625rem] border-2 border-dashed"
          style={{ borderColor: 'var(--accent)' }}
        />
      )}

      <DumpCard
        dump={dump}
        onDelete={onDelete}
        onClick={onClick}
        showCheckbox={showCheckbox}
        isSelected={isSelected}
        onSelectToggle={onSelectToggle}
        highlightedText={highlightedText}
      />
    </div>
  )
}
