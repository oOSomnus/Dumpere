import { useState, useEffect, useCallback } from 'react'
import { DEFAULT_APPEARANCE_SETTINGS, resolveAppearance } from '@/shared/appearance'
import type { AppearanceSettings, ColorSchemeId, ResolvedAppearance, ThemeMode } from '@/shared/types'
import { getAppearanceTheme, THEME_TOKEN_NAMES } from '../lib/appearance-registry'
import { getElectronAPI } from '../lib/electron-api'

function getInitialOsPrefersDark(): boolean {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return false
}

function applyResolvedAppearance(appearance: ResolvedAppearance): void {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  const theme = getAppearanceTheme(appearance.colorScheme)
  const tokens = appearance.isDark ? theme.darkTokens : theme.lightTokens

  root.classList.toggle('dark', appearance.isDark)
  root.dataset.colorScheme = appearance.colorScheme

  for (const tokenName of THEME_TOKEN_NAMES) {
    root.style.setProperty(tokenName, tokens[tokenName])
  }
}

export function useAppearance() {
  const api = getElectronAPI()
  const [appearance, setAppearance] = useState<AppearanceSettings>(DEFAULT_APPEARANCE_SETTINGS)
  const [osPrefersDark, setOsPrefersDark] = useState(getInitialOsPrefersDark)
  const [resolvedAppearance, setResolvedAppearance] = useState<ResolvedAppearance>(() =>
    resolveAppearance(DEFAULT_APPEARANCE_SETTINGS, getInitialOsPrefersDark())
  )
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const resolved = resolveAppearance(appearance, osPrefersDark)
    setResolvedAppearance(resolved)
    applyResolvedAppearance(resolved)
  }, [appearance, osPrefersDark])

  useEffect(() => {
    api.ui.getAppearance().then((settings) => {
      setAppearance(settings)
    }).catch(() => {
      setAppearance(DEFAULT_APPEARANCE_SETTINGS)
    }).finally(() => {
      setIsLoaded(true)
    })
  }, [api])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (event: MediaQueryListEvent) => {
      setOsPrefersDark(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const unsubscribe = api.ui.onAppearanceChange((nextAppearance) => {
      setAppearance({
        mode: nextAppearance.mode,
        colorScheme: nextAppearance.colorScheme
      })
      setResolvedAppearance(nextAppearance)
      applyResolvedAppearance(nextAppearance)
    })

    return unsubscribe
  }, [api])

  const updateAppearance = useCallback(async (patch: Partial<AppearanceSettings>) => {
    const savedAppearance = await api.ui.updateAppearance(patch)
    setAppearance(savedAppearance)
  }, [api])

  const setMode = useCallback(async (mode: ThemeMode) => {
    await updateAppearance({ mode })
  }, [updateAppearance])

  const setColorScheme = useCallback(async (colorScheme: ColorSchemeId) => {
    await updateAppearance({ colorScheme })
  }, [updateAppearance])

  return {
    appearance,
    resolvedAppearance,
    isDark: resolvedAppearance.isDark,
    isLoaded,
    updateAppearance,
    setMode,
    setColorScheme
  }
}
