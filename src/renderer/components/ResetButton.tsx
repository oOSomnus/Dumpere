import { useState } from 'react'
import { RotateCcw } from 'lucide-react'

interface ResetButtonProps {
  onClick: () => void
}

/**
 * Reset icon button using Lucide RotateCcw.
 * Resores panel sizes to defaults (sidebar: 240px, input: 48px).
 */
export function ResetButton({ onClick }: ResetButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      aria-label="Reset panel sizes"
      style={{
        appearance: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        minWidth: '32px',
        minHeight: '32px',
        width: '32px',
        height: '32px',
        padding: 0,
        lineHeight: 0,
        backgroundColor: isHovered ? 'var(--sidebar-accent)' : 'transparent',
        border: '1px solid transparent',
        borderRadius: '8px',
        cursor: 'pointer',
        color: isHovered ? 'var(--sidebar-foreground)' : 'var(--muted-foreground)',
        transition: 'color 150ms ease, background-color 150ms ease',
      }}
    >
      <RotateCcw size={16} strokeWidth={2} />
    </button>
  )
}
