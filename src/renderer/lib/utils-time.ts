import type { ResolvedLocale } from '@/shared/types'

export function formatRelativeTime(timestamp: number, locale: ResolvedLocale = 'en'): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (seconds < 60) return rtf.format(0, 'second')
  if (minutes < 60) return rtf.format(-minutes, 'minute')
  if (hours < 24) return rtf.format(-hours, 'hour')
  if (days < 7) return rtf.format(-days, 'day')

  const date = new Date(timestamp)
  return new Intl.DateTimeFormat(locale, {
    month: locale === 'zh-CN' ? 'numeric' : 'short',
    day: 'numeric'
  }).format(date)
}
