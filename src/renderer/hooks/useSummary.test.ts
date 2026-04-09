import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { SummaryEntry } from '../lib/types'
import { mockElectronAPI } from '../lib/types'

// Import the hook AFTER setting up spies
import { useSummary } from './useSummary'

describe('useSummary', () => {
  const createMockSummary = (overrides: Partial<SummaryEntry> = {}): SummaryEntry => ({
    id: crypto.randomUUID(),
    type: 'daily',
    projectId: null,
    generatedAt: Date.now(),
    content: 'Test summary content',
    dumpCount: 5,
    ...overrides
  })

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks()
    // Default mock implementations
    vi.spyOn(mockElectronAPI, 'getSummaries').mockResolvedValue([])
    vi.spyOn(mockElectronAPI, 'generateSummary').mockResolvedValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('loads stored summaries on mount via useEffect', async () => {
      const storedSummaries = [createMockSummary({ id: '1' }), createMockSummary({ id: '2' })]
      ;(mockElectronAPI.getSummaries as ReturnType<typeof vi.fn>).mockResolvedValueOnce(storedSummaries)

      const { result } = renderHook(() => useSummary())

      await waitFor(() => {
        expect(mockElectronAPI.getSummaries).toHaveBeenCalled()
      })
    })

    it('sets currentSummary to most recent stored summary on mount', async () => {
      const older = createMockSummary({ id: '1', generatedAt: Date.now() - 10000 })
      const newer = createMockSummary({ id: '2', generatedAt: Date.now() })
      ;(mockElectronAPI.getSummaries as ReturnType<typeof vi.fn>).mockResolvedValueOnce([older, newer])

      const { result } = renderHook(() => useSummary())

      await waitFor(() => {
        expect(result.current.currentSummary?.id).toBe('2')
      })
    })

    it('sets summaries list from stored summaries on mount', async () => {
      const storedSummaries = [createMockSummary({ id: '1' })]
      ;(mockElectronAPI.getSummaries as ReturnType<typeof vi.fn>).mockResolvedValueOnce(storedSummaries)

      const { result } = renderHook(() => useSummary())

      await waitFor(() => {
        expect(result.current.summaries).toHaveLength(1)
        expect(result.current.summaries[0].id).toBe('1')
      })
    })
  })

  describe('generateSummary', () => {
    it('calls api.generateSummary and sets currentSummary on success', async () => {
      const newSummary = createMockSummary({ content: 'New summary' })
      ;(mockElectronAPI.generateSummary as ReturnType<typeof vi.fn>).mockResolvedValueOnce(newSummary)
      ;(mockElectronAPI.getSummaries as ReturnType<typeof vi.fn>).mockResolvedValue([newSummary])

      const { result } = renderHook(() => useSummary())

      // Wait for initial mount
      await waitFor(() => {
        expect(mockElectronAPI.getSummaries).toHaveBeenCalled()
      })

      await act(async () => {
        await result.current.generateSummary('daily', null)
      })

      expect(mockElectronAPI.generateSummary).toHaveBeenCalledWith({ type: 'daily', projectId: null })
      await waitFor(() => {
        expect(result.current.currentSummary).toEqual(newSummary)
      })
    })

    it('sets error on generateSummary failure', async () => {
      ;(mockElectronAPI.generateSummary as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Generation failed'))

      const { result } = renderHook(() => useSummary())

      await waitFor(() => {
        expect(mockElectronAPI.getSummaries).toHaveBeenCalled()
      })

      await act(async () => {
        await expect(result.current.generateSummary('daily', null)).rejects.toThrow('Generation failed')
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Generation failed')
      })
    })

    it('throws error when generateSummary returns null (no dumps)', async () => {
      ;(mockElectronAPI.generateSummary as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

      const { result } = renderHook(() => useSummary())

      await waitFor(() => {
        expect(mockElectronAPI.getSummaries).toHaveBeenCalled()
      })

      await act(async () => {
        await expect(result.current.generateSummary('daily', null)).rejects.toThrow('No dumps found to summarize')
      })
    })
  })

  describe('summaries list refresh', () => {
    it('refreshes summaries list after generation', async () => {
      const initialSummaries = [createMockSummary({ id: 'initial' })]
      const newSummary = createMockSummary({ id: 'new' })
      ;(mockElectronAPI.generateSummary as ReturnType<typeof vi.fn>).mockResolvedValue(newSummary)
      ;(mockElectronAPI.getSummaries as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(initialSummaries)
        .mockResolvedValue([...initialSummaries, newSummary])

      const { result } = renderHook(() => useSummary())

      await waitFor(() => {
        expect(result.current.summaries).toEqual(initialSummaries)
      })

      await act(async () => {
        await result.current.generateSummary('daily', null)
      })

      await waitFor(() => {
        expect(result.current.summaries).toContainEqual(newSummary)
      })
    })
  })

  describe('clearError', () => {
    it('clears the error state', async () => {
      ;(mockElectronAPI.generateSummary as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Generation failed'))

      const { result } = renderHook(() => useSummary())

      await waitFor(() => {
        expect(mockElectronAPI.getSummaries).toHaveBeenCalled()
      })

      await act(async () => {
        await expect(result.current.generateSummary('daily', null)).rejects.toThrow()
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('setCurrentSummary', () => {
    it('sets the currentSummary manually', async () => {
      const { result } = renderHook(() => useSummary())

      await waitFor(() => {
        expect(mockElectronAPI.getSummaries).toHaveBeenCalled()
      })

      const summary = createMockSummary({ id: 'manual' })

      act(() => {
        result.current.setCurrentSummary(summary)
      })

      expect(result.current.currentSummary).toEqual(summary)
    })

    it('can set currentSummary to null', async () => {
      const { result } = renderHook(() => useSummary())

      await waitFor(() => {
        expect(mockElectronAPI.getSummaries).toHaveBeenCalled()
      })

      const summary = createMockSummary()
      act(() => {
        result.current.setCurrentSummary(summary)
      })
      expect(result.current.currentSummary).toEqual(summary)

      act(() => {
        result.current.setCurrentSummary(null)
      })
      expect(result.current.currentSummary).toBeNull()
    })
  })
})
