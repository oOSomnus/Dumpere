import { FileText, LayoutGrid, Settings } from 'lucide-react'
import { cn } from '@/shared/cn'
import type { AppView } from '../../hooks/useAppController'
import { useI18n } from '@/renderer/i18n'

interface SidebarViewNavigationProps {
  currentView: AppView
  onViewChange?: (view: AppView) => void
}

export function SidebarViewNavigation({
  currentView,
  onViewChange
}: SidebarViewNavigationProps) {
  const { t } = useI18n()
  const views: Array<{ icon: typeof LayoutGrid; label: string; value: AppView }> = [
    { icon: LayoutGrid, label: t('sidebar.dumps'), value: 'grid' },
    { icon: FileText, label: t('sidebar.summaries'), value: 'summaries' },
    { icon: Settings, label: t('sidebar.settings'), value: 'settings' }
  ]

  return (
    <div className="space-y-1">
      {views.map(({ icon: Icon, label, value }) => (
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
