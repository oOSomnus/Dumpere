import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_LOCALE, DEFAULT_RESOLVED_LOCALE, resolveLocale } from '@/shared/locale'
import type { Locale, ResolvedLocale } from '@/shared/types'
import { getElectronAPI } from './lib/electron-api'
import { messages, type TranslationKey } from './i18n/messages'

type TranslationValues = Record<string, string | number>

interface I18nContextValue {
  locale: Locale
  resolvedLocale: ResolvedLocale
  setLocale: (locale: Locale) => Promise<void>
  t: (key: TranslationKey, values?: TranslationValues) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)
const fallbackContext: I18nContextValue = {
  locale: DEFAULT_LOCALE,
  resolvedLocale: DEFAULT_RESOLVED_LOCALE,
  setLocale: async () => {},
  t: (key, values) => interpolate(messages[DEFAULT_RESOLVED_LOCALE][key], values)
}

function interpolate(template: string, values?: TranslationValues): string {
  if (!values) {
    return template
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => `${values[key] ?? ''}`)
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const api = getElectronAPI()
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)
  const [resolvedLocale, setResolvedLocale] = useState<ResolvedLocale>(DEFAULT_RESOLVED_LOCALE)

  useEffect(() => {
    let cancelled = false

    const loadLocale = async () => {
      try {
        const [storedLocale, systemLocale] = await Promise.all([
          api.ui.getLocale(),
          api.ui.getSystemLocale()
        ])

        if (cancelled) {
          return
        }

        setLocaleState(storedLocale)
        setResolvedLocale(resolveLocale(storedLocale, systemLocale))
      } catch {
        if (!cancelled) {
          setLocaleState(DEFAULT_LOCALE)
          setResolvedLocale(DEFAULT_RESOLVED_LOCALE)
        }
      }
    }

    void loadLocale()

    return () => {
      cancelled = true
    }
  }, [api.ui])

  const updateLocale = async (nextLocale: Locale) => {
    const [storedLocale, systemLocale] = await Promise.all([
      api.ui.setLocale(nextLocale),
      api.ui.getSystemLocale()
    ])

    setLocaleState(storedLocale)
    setResolvedLocale(resolveLocale(storedLocale, systemLocale))
  }

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    resolvedLocale,
    setLocale: updateLocale,
    t: (key, values) => interpolate(messages[resolvedLocale][key], values)
  }), [locale, resolvedLocale])

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext) ?? fallbackContext
}
