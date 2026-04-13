import type { DateFilterState, DatePreset } from '@/shared/types'
import { cn } from '@/shared/cn'
import { DateFilterPopover } from '@/renderer/components/DateFilterPopover'
import { useI18n } from '@/renderer/i18n'

interface SidebarDateSectionProps {
  dateFilter: DateFilterState
  onDatePresetChange: (preset: DatePreset | null) => void
  onToggleDate: (dateKey: string) => void
  onSetDateKeys: (dateKeys: string[]) => void
  onClearDateFilter: () => void
}

export function SidebarDateSection({
  dateFilter,
  onDatePresetChange,
  onToggleDate,
  onSetDateKeys,
  onClearDateFilter
}: SidebarDateSectionProps) {
  const { t } = useI18n()
  const presetOptions: Array<{ value: DatePreset | null; label: string }> = [
    { value: null, label: t('sidebar.allTime') },
    { value: 'today', label: t('sidebar.today') },
    { value: 'week', label: t('sidebar.thisWeek') },
    { value: 'month', label: t('sidebar.thisMonth') }
  ]

  return (
    <div className="p-3">
      <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--sidebar-foreground)' }}>
        {t('sidebar.dates')}
      </h2>
      <div className="flex flex-col gap-1">
        {presetOptions.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onDatePresetChange(preset.value)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-md text-sm transition-colors duration-150',
              'hover:bg-sidebar-accent'
            )}
            style={{
              backgroundColor:
                (preset.value === null && dateFilter.mode === 'all') ||
                (preset.value !== null && dateFilter.mode === 'preset' && dateFilter.preset === preset.value)
                  ? 'var(--sidebar-accent)'
                  : 'transparent',
              color: 'var(--sidebar-foreground)',
            }}
          >
            {preset.label}
          </button>
        ))}

        <DateFilterPopover
          selectedDates={dateFilter.mode === 'dates' ? dateFilter.dates : []}
          onToggleDate={onToggleDate}
          onSetDateKeys={onSetDateKeys}
          onClear={onClearDateFilter}
        />
      </div>
    </div>
  )
}
