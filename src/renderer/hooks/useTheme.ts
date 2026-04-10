import { useState, useEffect, useCallback } from 'react'
import { getElectronAPI } from '../lib/electron-api'

type ThemeSetting = 'light' | 'dark' | 'system'

function getEffectiveIsDark(setting: ThemeSetting, osPrefersDark: boolean): boolean {
  if (setting === 'system') {
    return osPrefersDark
  }
  return setting === 'dark'
}

function applyThemeClass(isDark: boolean): void {
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function useTheme() {
  const api = getElectronAPI()
  const [themeSetting, setThemeSetting] = useState<ThemeSetting>('system')
  const [osPrefersDark, setOsPrefersDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })
  const [isDark, setIsDark] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Sync effective isDark whenever setting or OS pref changes
  useEffect(() => {
    const effective = getEffectiveIsDark(themeSetting, osPrefersDark)
    setIsDark(effective)
    applyThemeClass(effective)
  }, [themeSetting, osPrefersDark])

  // Initialize: read stored theme from electron-store
  useEffect(() => {
    api.getTheme().then((setting: ThemeSetting) => {
      setThemeSetting(setting)
    }).catch(() => {
      setThemeSetting('system')
    }).finally(() => {
      setIsLoaded(true)
    })
  }, [api])

  // Listen for OS theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      setOsPrefersDark(e.matches)
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Listen for theme:changed from main process (e.g., from theme:set in another window)
  useEffect(() => {
    const unsubscribe = api.onThemeChange((dark: boolean) => {
      setIsDark(dark)
      applyThemeClass(dark)
    })
    return unsubscribe
  }, [api])

  const setTheme = useCallback(async (setting: ThemeSetting) => {
    setThemeSetting(setting)
    await api.setTheme(setting)
    const effective = getEffectiveIsDark(setting, osPrefersDark)
    setIsDark(effective)
    applyThemeClass(effective)
  }, [api, osPrefersDark])

  const toggleTheme = useCallback(async (checked?: boolean) => {
    const next = typeof checked === 'boolean'
      ? (checked ? 'dark' : 'light')
      : (isDark ? 'light' : 'dark')
    await setTheme(next)
  }, [isDark, setTheme])

  return { isDark, isLoaded, themeSetting, setTheme, toggleTheme }
}
