import { useState, useEffect, useCallback } from 'react'

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
    if (typeof window !== 'undefined' && window.electronAPI?.getTheme) {
      window.electronAPI.getTheme().then((setting: ThemeSetting) => {
        setThemeSetting(setting)
      }).catch(() => {
        // fallback to system if getTheme fails
        setThemeSetting('system')
      }).finally(() => {
        setIsLoaded(true)
      })
    } else {
      setIsLoaded(true)
    }
  }, [])

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
    if (typeof window === 'undefined' || !window.electronAPI?.onThemeChange) return

    let isMounted = true
    window.electronAPI.onThemeChange((dark: boolean) => {
      if (!isMounted) return
      setIsDark(dark)
      applyThemeClass(dark)
    })
    return () => { isMounted = false }
  }, [])

  const setTheme = useCallback(async (setting: ThemeSetting) => {
    setThemeSetting(setting)
    if (typeof window !== 'undefined' && window.electronAPI?.setTheme) {
      await window.electronAPI.setTheme(setting)
    }
    const effective = getEffectiveIsDark(setting, osPrefersDark)
    setIsDark(effective)
    applyThemeClass(effective)
  }, [osPrefersDark])

  const toggleTheme = useCallback(async (checked?: boolean) => {
    const next = typeof checked === 'boolean'
      ? (checked ? 'dark' : 'light')
      : (isDark ? 'light' : 'dark')
    await setTheme(next)
  }, [isDark, setTheme])

  return { isDark, isLoaded, themeSetting, setTheme, toggleTheme }
}
