import { ReactNode } from 'react'
import { ResizeHandle } from './ResizeHandle'
import { ResetButton } from './ResetButton'

interface AppShellProps {
  children: ReactNode
  sidebar: ReactNode  // Phase 2: Sidebar component
  sidebarWidth?: number
  onSidebarWidthChange?: (width: number) => void
  onReset?: () => void
}

export function AppShell({
  children,
  sidebar,
  sidebarWidth = 240,
  onSidebarWidthChange,
  onReset,
}: AppShellProps) {
  const handleSidebarResizeStart = (e: React.MouseEvent) => {
    if (!onSidebarWidthChange) return
    e.preventDefault()
    const startX = e.clientX
    const startWidth = sidebarWidth

    const clamp = (value: number, min: number, max: number) =>
      Math.min(Math.max(value, min), max)

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX
      const newWidth = clamp(startWidth + delta, 120, 400)
      onSidebarWidthChange(newWidth)
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div
      className="theme"
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)'
      }}
    >
      {/* Sidebar — dynamic width, full height, scrollable */}
      <div
        style={{
          width: sidebarWidth,
          flexShrink: 0,
          height: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingBottom: '48px',
          boxSizing: 'border-box',
          borderRight: '1px solid var(--border)',
          position: 'relative',
        }}
      >
        {sidebar}
        {/* Resize handle at right edge */}
        {onSidebarWidthChange && (
          <ResizeHandle direction="horizontal" onDragStart={handleSidebarResizeStart} />
        )}
      </div>

      {/* ResetButton — outside sidebar wrapper, at bottom-left of sidebar area */}
      {onReset && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: `${sidebarWidth}px`,
            height: '48px',
            padding: '8px',
            boxSizing: 'border-box',
            borderTop: '1px solid var(--sidebar-border)',
            borderRight: '1px solid var(--sidebar-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            backgroundColor: 'var(--sidebar)',
            zIndex: 35,
          }}
        >
          <ResetButton onClick={onReset} />
        </div>
      )}

      {/* Main content area — flex-1, scrollable */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {children}
      </main>
    </div>
  )
}
