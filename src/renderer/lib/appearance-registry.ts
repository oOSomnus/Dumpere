import type { ColorSchemeId } from '@/shared/types'

export const THEME_TOKEN_NAMES = [
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--accent',
  '--accent-foreground',
  '--destructive',
  '--destructive-foreground',
  '--border',
  '--input',
  '--ring',
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
  '--radius',
  '--sidebar',
  '--sidebar-foreground',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
  '--sidebar-border',
  '--sidebar-ring',
  '--tag-solid-foreground'
] as const

export type ThemeTokenName = (typeof THEME_TOKEN_NAMES)[number]
export type ThemeTokens = Record<ThemeTokenName, string>

export interface AppearanceThemeDefinition {
  id: ColorSchemeId
  lightTokens: ThemeTokens
  darkTokens: ThemeTokens
}

const defaultLightTokens: ThemeTokens = {
  '--background': 'oklch(1 0 0)',
  '--foreground': 'oklch(0.145 0 0)',
  '--card': 'oklch(1 0 0)',
  '--card-foreground': 'oklch(0.145 0 0)',
  '--popover': 'oklch(1 0 0)',
  '--popover-foreground': 'oklch(0.145 0 0)',
  '--primary': 'oklch(0.205 0 0)',
  '--primary-foreground': 'oklch(0.985 0 0)',
  '--secondary': 'oklch(0.97 0 0)',
  '--secondary-foreground': 'oklch(0.205 0 0)',
  '--muted': 'oklch(0.97 0 0)',
  '--muted-foreground': 'oklch(0.556 0 0)',
  '--accent': 'oklch(0.97 0 0)',
  '--accent-foreground': 'oklch(0.205 0 0)',
  '--destructive': 'oklch(0.577 0.245 27.325)',
  '--destructive-foreground': 'oklch(0.985 0 0)',
  '--border': 'oklch(0.922 0 0)',
  '--input': 'oklch(0.922 0 0)',
  '--ring': 'oklch(0.708 0 0)',
  '--chart-1': 'oklch(0.87 0 0)',
  '--chart-2': 'oklch(0.556 0 0)',
  '--chart-3': 'oklch(0.439 0 0)',
  '--chart-4': 'oklch(0.371 0 0)',
  '--chart-5': 'oklch(0.269 0 0)',
  '--radius': '0.625rem',
  '--sidebar': 'oklch(0.985 0 0)',
  '--sidebar-foreground': 'oklch(0.145 0 0)',
  '--sidebar-primary': 'oklch(0.205 0 0)',
  '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
  '--sidebar-accent': 'oklch(0.97 0 0)',
  '--sidebar-accent-foreground': 'oklch(0.205 0 0)',
  '--sidebar-border': 'oklch(0.922 0 0)',
  '--sidebar-ring': 'oklch(0.708 0 0)',
  '--tag-solid-foreground': '#1f2937'
}

const defaultDarkTokens: ThemeTokens = {
  '--background': 'oklch(0.145 0 0)',
  '--foreground': 'oklch(0.985 0 0)',
  '--card': 'oklch(0.205 0 0)',
  '--card-foreground': 'oklch(0.985 0 0)',
  '--popover': 'oklch(0.205 0 0)',
  '--popover-foreground': 'oklch(0.985 0 0)',
  '--primary': 'oklch(0.922 0 0)',
  '--primary-foreground': 'oklch(0.205 0 0)',
  '--secondary': 'oklch(0.269 0 0)',
  '--secondary-foreground': 'oklch(0.985 0 0)',
  '--muted': 'oklch(0.269 0 0)',
  '--muted-foreground': 'oklch(0.708 0 0)',
  '--accent': 'oklch(0.269 0 0)',
  '--accent-foreground': 'oklch(0.985 0 0)',
  '--destructive': 'oklch(0.704 0.191 22.216)',
  '--destructive-foreground': 'oklch(0.985 0 0)',
  '--border': 'oklch(1 0 0 / 10%)',
  '--input': 'oklch(1 0 0 / 15%)',
  '--ring': 'oklch(0.556 0 0)',
  '--chart-1': 'oklch(0.87 0 0)',
  '--chart-2': 'oklch(0.556 0 0)',
  '--chart-3': 'oklch(0.439 0 0)',
  '--chart-4': 'oklch(0.371 0 0)',
  '--chart-5': 'oklch(0.269 0 0)',
  '--radius': '0.625rem',
  '--sidebar': 'oklch(0.205 0 0)',
  '--sidebar-foreground': 'oklch(0.985 0 0)',
  '--sidebar-primary': 'oklch(0.488 0.243 264.376)',
  '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
  '--sidebar-accent': 'oklch(0.269 0 0)',
  '--sidebar-accent-foreground': 'oklch(0.985 0 0)',
  '--sidebar-border': 'oklch(1 0 0 / 10%)',
  '--sidebar-ring': 'oklch(0.556 0 0)',
  '--tag-solid-foreground': '#111827'
}

// Based on AnuPpuccin's default Catppuccin flavors:
// Latte for light mode and Mocha for dark mode.
const anuppuccinLightTokens: ThemeTokens = {
  '--background': '#eff1f5',
  '--foreground': '#4c4f69',
  '--card': '#e6e9ef',
  '--card-foreground': '#4c4f69',
  '--popover': '#e6e9ef',
  '--popover-foreground': '#4c4f69',
  '--primary': '#8839ef',
  '--primary-foreground': '#eff1f5',
  '--secondary': '#ccd0da',
  '--secondary-foreground': '#4c4f69',
  '--muted': '#e6e9ef',
  '--muted-foreground': '#6c6f85',
  '--accent': '#ccd0da',
  '--accent-foreground': '#4c4f69',
  '--destructive': '#d20f39',
  '--destructive-foreground': '#eff1f5',
  '--border': '#ccd0da',
  '--input': '#ccd0da',
  '--ring': '#7287fd',
  '--chart-1': '#1e66f5',
  '--chart-2': '#179299',
  '--chart-3': '#40a02b',
  '--chart-4': '#df8e1d',
  '--chart-5': '#8839ef',
  '--radius': '0.625rem',
  '--sidebar': '#e6e9ef',
  '--sidebar-foreground': '#4c4f69',
  '--sidebar-primary': '#8839ef',
  '--sidebar-primary-foreground': '#eff1f5',
  '--sidebar-accent': '#ccd0da',
  '--sidebar-accent-foreground': '#4c4f69',
  '--sidebar-border': '#dce0e8',
  '--sidebar-ring': '#7287fd',
  '--tag-solid-foreground': '#1f2937'
}

const anuppuccinDarkTokens: ThemeTokens = {
  '--background': '#1e1e2e',
  '--foreground': '#cdd6f4',
  '--card': '#181825',
  '--card-foreground': '#cdd6f4',
  '--popover': '#181825',
  '--popover-foreground': '#cdd6f4',
  '--primary': '#cba6f7',
  '--primary-foreground': '#1e1e2e',
  '--secondary': '#313244',
  '--secondary-foreground': '#cdd6f4',
  '--muted': '#313244',
  '--muted-foreground': '#a6adc8',
  '--accent': '#313244',
  '--accent-foreground': '#cdd6f4',
  '--destructive': '#f38ba8',
  '--destructive-foreground': '#11111b',
  '--border': '#313244',
  '--input': '#45475a',
  '--ring': '#b4befe',
  '--chart-1': '#89b4fa',
  '--chart-2': '#94e2d5',
  '--chart-3': '#a6e3a1',
  '--chart-4': '#f9e2af',
  '--chart-5': '#cba6f7',
  '--radius': '0.625rem',
  '--sidebar': '#181825',
  '--sidebar-foreground': '#cdd6f4',
  '--sidebar-primary': '#cba6f7',
  '--sidebar-primary-foreground': '#1e1e2e',
  '--sidebar-accent': '#313244',
  '--sidebar-accent-foreground': '#cdd6f4',
  '--sidebar-border': '#313244',
  '--sidebar-ring': '#b4befe',
  '--tag-solid-foreground': '#111827'
}

export const APPEARANCE_THEMES: Record<ColorSchemeId, AppearanceThemeDefinition> = {
  default: {
    id: 'default',
    lightTokens: defaultLightTokens,
    darkTokens: defaultDarkTokens
  },
  anuppuccin: {
    id: 'anuppuccin',
    lightTokens: anuppuccinLightTokens,
    darkTokens: anuppuccinDarkTokens
  }
}

export function getAppearanceTheme(colorScheme: ColorSchemeId): AppearanceThemeDefinition {
  return APPEARANCE_THEMES[colorScheme]
}
