import { FileText, LayoutGrid, Settings } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { AppView } from '../../hooks/useAppController'

interface SidebarViewNavigationProps {
  currentView: AppView
  onViewChange?: (view: AppView) => void
}

const VIEWS: Array<{ icon: typeof LayoutGrid; label: string; value: AppView }> = [
  { icon: LayoutGrid, label: 'Dumps', value: 'grid' },
  { icon: FileText, label: 'Summaries', value: 'summaries' },
  { icon: Settings, label: 'Settings', value: 'settings' }
]

export function SidebarViewNavigation({
  currentView,
  onViewChange
}: SidebarViewNavigationProps) {
  return (
    <div className="space-y-1">
      {VIEWS.map(({ icon: Icon, label, value }) => (
        <button
          key={value}
          onClick={() => onViewChange?.(value)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
            'hover:bg-sidebar-accent'
          )}
          style={{
            backgroundColor: currentView === value ? 'var(--sidebar-accent)' : 'transparent',
            color: 'var(--sidebar-foreground)'
          }}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
