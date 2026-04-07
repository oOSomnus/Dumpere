import { useState, useEffect } from 'react'

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    // Default to system preference via CSS
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  useEffect(() => {
    // Listen for theme changes from main process (OS theme change)
    if (typeof window !== 'undefined' && window.electronAPI?.onThemeChange) {
      window.electronAPI.onThemeChange((dark: boolean) => {
        setIsDark(dark)
      })
    }
  }, [])

  return isDark
}
