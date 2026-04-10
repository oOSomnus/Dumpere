import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockElectronAPI } from '../lib/types'
import { useTheme } from './useTheme'

describe('useTheme', () => {
  const removeMediaListener = vi.fn()
  const addMediaListener = vi.fn()

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: addMediaListener,
        removeEventListener: removeMediaListener
      })
    })
  })

  it('unsubscribes from theme change notifications on unmount', async () => {
    const unsubscribe = vi.fn()

    window.electronAPI = {
      ...mockElectronAPI,
      getTheme: vi.fn(async () => 'system'),
      onThemeChange: vi.fn(() => unsubscribe)
    }

    const { result, unmount } = renderHook(() => useTheme())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    unmount()

    expect(window.electronAPI.onThemeChange).toHaveBeenCalledTimes(1)
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    expect(removeMediaListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
