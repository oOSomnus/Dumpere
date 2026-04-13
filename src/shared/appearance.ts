import type { AppearanceSettings, ColorSchemeId, ResolvedAppearance, ThemeMode } from './types'

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  mode: 'system',
  colorScheme: 'default'
}

const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system']
const COLOR_SCHEMES: ColorSchemeId[] = ['default', 'anuppuccin']

export function sanitizeThemeMode(input: unknown): ThemeMode {
  return THEME_MODES.includes(input as ThemeMode)
    ? (input as ThemeMode)
    : DEFAULT_APPEARANCE_SETTINGS.mode
}

export function sanitizeColorSchemeId(input: unknown): ColorSchemeId {
  return COLOR_SCHEMES.includes(input as ColorSchemeId)
    ? (input as ColorSchemeId)
    : DEFAULT_APPEARANCE_SETTINGS.colorScheme
}

export function sanitizeAppearanceSettings(
  input?: Partial<AppearanceSettings> | null
): AppearanceSettings {
  return {
    mode: sanitizeThemeMode(input?.mode),
    colorScheme: sanitizeColorSchemeId(input?.colorScheme)
  }
}

export function getEffectiveIsDark(mode: ThemeMode, osPrefersDark: boolean): boolean {
  if (mode === 'system') {
    return osPrefersDark
  }
  return mode === 'dark'
}

export function resolveAppearance(
  input?: Partial<AppearanceSettings> | null,
  osPrefersDark = false
): ResolvedAppearance {
  const appearance = sanitizeAppearanceSettings(input)
  return {
    ...appearance,
    isDark: getEffectiveIsDark(appearance.mode, osPrefersDark)
  }
}
