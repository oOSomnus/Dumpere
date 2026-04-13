import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockElectronAPI } from '../lib/types'
import { useAppearance } from './useAppearance'

describe('useAppearance', () => {
  const removeMediaListener = vi.fn()
  const addMediaListener = vi.fn()

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-color-scheme')
    document.documentElement.removeAttribute('style')

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: addMediaListener,
        removeEventListener: removeMediaListener
      })
    })
  })

  it('applies the resolved appearance and unsubscribes on unmount', async () => {
    const unsubscribe = vi.fn()

    window.electronAPI = {
      ...mockElectronAPI,
      ui: {
        ...mockElectronAPI.ui,
        getAppearance: vi.fn(async () => ({ mode: 'dark', colorScheme: 'anuppuccin' })),
        onAppearanceChange: vi.fn(() => unsubscribe)
      }
    }

    const { result, unmount } = renderHook(() => useAppearance())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement.dataset.colorScheme).toBe('anuppuccin')
    expect(document.documentElement.style.getPropertyValue('--background')).toBe('#1e1e2e')

    unmount()

    expect(window.electronAPI.ui.onAppearanceChange).toHaveBeenCalledTimes(1)
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    expect(removeMediaListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('updates the selected color scheme through the ui api', async () => {
    const updateAppearance = vi.fn(async (patch: { colorScheme?: 'default' | 'anuppuccin' }) => ({
      mode: 'light' as const,
      colorScheme: patch.colorScheme ?? 'default'
    }))

    window.electronAPI = {
      ...mockElectronAPI,
      ui: {
        ...mockElectronAPI.ui,
        getAppearance: vi.fn(async () => ({ mode: 'light', colorScheme: 'default' })),
        updateAppearance,
        onAppearanceChange: vi.fn(() => vi.fn())
      }
    }

    const { result } = renderHook(() => useAppearance())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    await act(async () => {
      await result.current.setColorScheme('anuppuccin')
    })

    await waitFor(() => {
      expect(document.documentElement.dataset.colorScheme).toBe('anuppuccin')
    })

    expect(updateAppearance).toHaveBeenCalledWith({ colorScheme: 'anuppuccin' })
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('#8839ef')
  })
})
