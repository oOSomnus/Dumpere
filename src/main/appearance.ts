import { BrowserWindow, nativeTheme } from 'electron'
import {
  DEFAULT_APPEARANCE_SETTINGS,
  resolveAppearance,
  sanitizeAppearanceSettings,
  sanitizeThemeMode
} from '@/shared/appearance'
import type { AppearanceSettings, ResolvedAppearance } from '@/shared/types'
import { store } from './store'

export function getStoredAppearanceSettings(): AppearanceSettings {
  if (store.has('appearance')) {
    const storedAppearance = store.get('appearance')
    const sanitized = sanitizeAppearanceSettings(storedAppearance)
    store.set('appearance', sanitized)
    return sanitized
  }

  const migrated = sanitizeAppearanceSettings({
    mode: sanitizeThemeMode(
      store.has('theme')
        ? store.get('theme')
        : DEFAULT_APPEARANCE_SETTINGS.mode
    ),
    colorScheme: DEFAULT_APPEARANCE_SETTINGS.colorScheme
  })

  store.set('appearance', migrated)
  return migrated
}

export function updateStoredAppearanceSettings(
  patch: Partial<AppearanceSettings>
): AppearanceSettings {
  const updated = sanitizeAppearanceSettings({
    ...getStoredAppearanceSettings(),
    ...patch
  })

  store.set('appearance', updated)
  return updated
}

export function getResolvedAppearance(): ResolvedAppearance {
  return resolveAppearance(getStoredAppearanceSettings(), nativeTheme.shouldUseDarkColors)
}

export function broadcastAppearanceChange(): void {
  const resolvedAppearance = getResolvedAppearance()
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('appearance:changed', resolvedAppearance)
  })
}
