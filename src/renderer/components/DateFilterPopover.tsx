import { useMemo, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { getMonthDateKeys, toLocalDateKey } from '../lib/date-utils'

interface DateFilterPopoverProps {
  selectedDates: string[]
  onToggleDate: (dateKey: string) => void
  onSetDateKeys: (dateKeys: string[]) => void
  onClear: () => void
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getMonthGrid(monthCursor: Date): Array<Date | null> {
  const firstDay = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1)
  const leadingEmpty = (firstDay.getDay() + 6) % 7
  const monthDates = getMonthDateKeys(monthCursor.getFullYear(), monthCursor.getMonth())
    .map(dateKey => new Date(`${dateKey}T00:00:00`))

  return [
    ...Array.from({ length: leadingEmpty }, () => null),
    ...monthDates
  ]
}

export function DateFilterPopover({
  selectedDates,
  onToggleDate,
  onSetDateKeys,
  onClear
}: DateFilterPopoverProps) {
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const monthGrid = useMemo(() => getMonthGrid(monthCursor), [monthCursor])
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric'
  }).format(monthCursor)

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
            'hover:bg-sidebar-accent'
          )}
          style={{
            backgroundColor: selectedDates.length > 0 ? 'var(--sidebar-accent)' : 'transparent',
            color: 'var(--sidebar-foreground)'
          }}
        >
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            <span>Choose Dates</span>
          </span>
          {selectedDates.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {selectedDates.length}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="right"
          align="start"
          className="z-50 w-[320px] rounded-xl border p-4 shadow-xl"
          style={{
            backgroundColor: 'var(--popover)',
            borderColor: 'var(--border)',
            color: 'var(--foreground)'
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                className="p-1 rounded hover:bg-accent"
                onClick={() => setMonthCursor(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="text-sm font-medium">{monthLabel}</p>
              <button
                className="p-1 rounded hover:bg-accent"
                onClick={() => setMonthCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-1">{label}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {monthGrid.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="h-9" />
                }

                const dateKey = toLocalDateKey(date)
                const isSelected = selectedDates.includes(dateKey)
                return (
                  <button
                    key={dateKey}
                    onClick={() => onToggleDate(dateKey)}
                    className={cn(
                      'h-9 rounded-md text-sm transition-colors',
                      'hover:bg-accent'
                    )}
                    style={{
                      backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                      color: isSelected ? 'var(--accent-foreground)' : 'var(--foreground)'
                    }}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="px-3 py-2 rounded-md text-sm"
                style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)' }}
                onClick={() => {
                  const today = new Date()
                  const dayOfWeek = today.getDay()
                  const offsetToMonday = (dayOfWeek + 6) % 7
                  const weekStart = new Date(today)
                  weekStart.setDate(today.getDate() - offsetToMonday)
                  weekStart.setHours(0, 0, 0, 0)
                  const weekKeys = Array.from({ length: 7 }, (_, index) => {
                    const next = new Date(weekStart)
                    next.setDate(weekStart.getDate() + index)
                    return toLocalDateKey(next)
                  })
                  onSetDateKeys(weekKeys)
                }}
              >
                This Week
              </button>
              <button
                className="px-3 py-2 rounded-md text-sm"
                style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)' }}
                onClick={() => onSetDateKeys(getMonthDateKeys(monthCursor.getFullYear(), monthCursor.getMonth()))}
              >
                Visible Month
              </button>
              <button
                className="px-3 py-2 rounded-md text-sm"
                style={{ backgroundColor: 'transparent', color: 'var(--muted-foreground)' }}
                onClick={onClear}
              >
                Clear
              </button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
