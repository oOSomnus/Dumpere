import { useEffect } from 'react'
import { NotebookPen, Trash2, X } from 'lucide-react'
import { cn } from '@/shared/cn'

interface FloatingActionBarProps {
  selectionCount: number
  onExport: () => void
  onDismiss: () => void
  onDelete?: () => void
  onQuote?: () => void
}

export function FloatingActionBar({
  selectionCount,
  onExport,
  onDismiss,
  onDelete,
  onQuote,
}: FloatingActionBarProps) {
  // Show only when selectionCount > 0
  if (selectionCount === 0) return null

  // Handle Escape key to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onDismiss])

  return (
    <div
      className={cn(
        'fixed z-50 flex items-center gap-3 px-4 py-3',
        'rounded-xl shadow-lg border'
      )}
      style={{
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'var(--popover)',
        borderColor: 'var(--border)',
      }}
      role="toolbar"
      aria-label="Selection actions"
    >
      <span
        className="text-sm"
        style={{ color: 'var(--foreground)' }}
      >
        {selectionCount} selected
      </span>

      {onQuote && (
        <button
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150'
          )}
          style={{
            backgroundColor: 'var(--secondary)',
            color: 'var(--secondary-foreground)',
          }}
          onClick={onQuote}
        >
          <NotebookPen className="w-4 h-4" />
          Quote
        </button>
      )}

      <button
        className={cn(
          'px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150'
        )}
        style={{
          backgroundColor: 'var(--primary)',
          color: 'var(--primary-foreground)',
        }}
        onClick={onExport}
      >
        Export
      </button>

      {onDelete && (
        <button
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150'
          )}
          style={{
            backgroundColor: 'var(--destructive)',
            color: 'white',
          }}
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      )}

      <button
        className="p-1 rounded"
        style={{ color: 'var(--muted-foreground)' }}
        onClick={onDismiss}
        aria-label="Clear selection"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
