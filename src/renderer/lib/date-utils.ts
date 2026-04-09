import type { DatePreset } from './types'

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

export function toLocalDateKey(input: number | Date): string {
  const date = input instanceof Date ? input : new Date(input)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function formatTimelineTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(timestamp))
}

export function formatTimelineDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric'
  }).format(new Date(timestamp))
}

export function getWeekDateKeys(baseDate = new Date()): string[] {
  const cursor = new Date(baseDate)
  const dayOfWeek = cursor.getDay()
  const offsetToMonday = (dayOfWeek + 6) % 7
  cursor.setHours(0, 0, 0, 0)
  cursor.setDate(cursor.getDate() - offsetToMonday)

  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(cursor)
    next.setDate(cursor.getDate() + index)
    return toLocalDateKey(next)
  })
}

export function getMonthDateKeys(year: number, month: number): string[] {
  const cursor = new Date(year, month, 1)
  const keys: string[] = []

  while (cursor.getMonth() === month) {
    keys.push(toLocalDateKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return keys
}

export function getPresetDateKeys(preset: DatePreset, baseDate = new Date()): string[] {
  if (preset === 'today') {
    return [toLocalDateKey(baseDate)]
  }

  if (preset === 'week') {
    return getWeekDateKeys(baseDate)
  }

  return getMonthDateKeys(baseDate.getFullYear(), baseDate.getMonth())
}
