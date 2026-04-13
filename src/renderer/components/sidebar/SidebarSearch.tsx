import type { AppView } from '@/renderer/hooks/useAppController'
import { useI18n } from '@/renderer/i18n'

interface SidebarSearchProps {
  searchQuery: string
  onSearchChange?: (query: string) => void
  onSearchFocusChange?: (focused: boolean) => void
  onViewChange?: (view: AppView) => void
}

export function SidebarSearch({
  searchQuery,
  onSearchChange,
  onSearchFocusChange,
  onViewChange
}: SidebarSearchProps) {
  const { t } = useI18n()
  if (!onSearchChange) {
    return null
  }

  return (
    <div className="p-3 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
      <input
        type="text"
        value={searchQuery}
        onFocus={() => onSearchFocusChange?.(true)}
        onBlur={() => onSearchFocusChange?.(false)}
        onChange={(event) => {
          onViewChange?.('grid')
          onSearchChange(event.target.value)
        }}
        placeholder={t('sidebar.searchPlaceholder')}
        className="w-full px-3 py-2 rounded-md text-sm"
        style={{
          backgroundColor: 'var(--input)',
          border: '1px solid var(--border)',
          color: 'var(--foreground)',
        }}
      />
    </div>
  )
}
