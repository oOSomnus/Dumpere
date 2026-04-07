import { cn } from '../../lib/utils'

export type TimeRange = 'today' | 'week' | 'month' | null

interface TimeRangeFilterProps {
  value: TimeRange
  onChange: (range: TimeRange) => void
}

const timeRanges: { value: TimeRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: null, label: 'All Time' },
]

export function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
  return (
    <div className="flex flex-col gap-1">
      {timeRanges.map((range) => (
        <button
          key={range.label}
          onClick={() => onChange(range.value)}
          className={cn(
            'w-full text-left px-3 py-2 rounded-md text-sm transition-colors duration-150',
            'hover:bg-accent'
          )}
          style={{
            backgroundColor: value === range.value ? 'var(--accent)' : 'transparent',
            color: 'var(--foreground)',
          }}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}
