import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface FloatingActionBarProps {
  selectionCount: number
  onExport: () => void
  onDismiss: () => void
}

export function FloatingActionBar({
  selectionCount,
  onExport,
  onDismiss,
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

  // Handle click outside to dismiss
  const handleOverlayClick = useCallback(() => {
    onDismiss()
  }, [onDismiss])

  return (
    <>
      {/* Transparent overlay to catch outside clicks */}
      <div
        className="fixed inset-0 z-40"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Floating bar */}
      <div
        className={cn(
          'fixed z-50 flex items-center gap-4 px-4 py-3',
          'rounded-xl shadow-lg',
          'border'
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
        {/* Selection count */}
        <span
          className="text-sm"
          style={{ color: 'var(--foreground)' }}
        >
          {selectionCount} selected
        </span>

        {/* Export button */}
        <button
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium',
            'transition-colors duration-150'
          )}
          style={{
            backgroundColor: 'var(--primary)',
            color: 'var(--primary-foreground)',
          }}
          onClick={onExport}
        >
          Export
        </button>

        {/* Dismiss button */}
        <button
          className="p-1 rounded"
          style={{ color: 'var(--muted-foreground)' }}
          onClick={onDismiss}
          aria-label="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </>
  )
}
