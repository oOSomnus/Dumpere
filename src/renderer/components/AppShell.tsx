import { ReactNode } from 'react'
import { useTheme } from '../hooks/useTheme'

interface AppShellProps {
  children: ReactNode
  sidebar: ReactNode  // Phase 2: Sidebar component
}

export function AppShell({ children, sidebar }: AppShellProps) {
  const isDark = useTheme()

  return (
    <div
      className={`${isDark ? 'dark' : ''} theme`}
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
      {/* Sidebar — 240px fixed width, full height, scrollable */}
      <div
        style={{
          width: '240px',
          flexShrink: 0,
          height: '100vh',
          overflowY: 'auto',
          borderRight: '1px solid var(--border)'
        }}
      >
        {sidebar}
      </div>

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
