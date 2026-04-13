import type { Locale, ResolvedLocale } from './types'

export const DEFAULT_LOCALE: Locale = 'system'
export const DEFAULT_RESOLVED_LOCALE: ResolvedLocale = 'en'

export function resolveSystemLocale(locale: string | null | undefined): ResolvedLocale {
  if (!locale) {
    return DEFAULT_RESOLVED_LOCALE
  }

  return locale.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

export function resolveLocale(locale: Locale, systemLocale: string | null | undefined): ResolvedLocale {
  return locale === 'system' ? resolveSystemLocale(systemLocale) : locale
}
