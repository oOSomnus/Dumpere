import { useState, useCallback, useEffect } from 'react'
import { SummaryEntry, mockElectronAPI } from '../lib/types'

const api = typeof window !== 'undefined' && window.electronAPI
  ? window.electronAPI
  : mockElectronAPI

interface UseSummaryReturn {
  currentSummary: SummaryEntry | null
  summaries: SummaryEntry[]  // Add: list of all stored summaries
  isLoading: boolean
  error: string | null
  generateSummary: (type: 'daily' | 'weekly', projectId: string | null) => Promise<void>
  clearError: () => void
  setCurrentSummary: (summary: SummaryEntry | null) => void
}

export function useSummary(): UseSummaryReturn {
  const [currentSummary, setCurrentSummary] = useState<SummaryEntry | null>(null)
  const [summaries, setSummaries] = useState<SummaryEntry[]>([])  // Add: stored summaries list
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Add: Load stored summaries on mount
  useEffect(() => {
    const loadStoredSummaries = async () => {
      try {
        const stored = await api.getSummaries()
        setSummaries(stored)
        // Auto-select the most recent summary if none selected
        if (stored.length > 0 && !currentSummary) {
          // Sort by generatedAt descending, pick most recent
          const sorted = [...stored].sort((a, b) => b.generatedAt - a.generatedAt)
          setCurrentSummary(sorted[0] ?? null)
        }
      } catch (err) {
        console.error('Failed to load stored summaries:', err)
      }
    }
    loadStoredSummaries()
  }, [])  // Empty deps - run once on mount

  const generateSummary = useCallback(async (type: 'daily' | 'weekly', projectId: string | null) => {
    setIsLoading(true)
    setError(null)

    try {
      const summary = await api.generateSummary({ type, projectId })
      if (summary) {
        setCurrentSummary(summary)
        // Refresh stored summaries list after generation
        const stored = await api.getSummaries()
        setSummaries(stored)
      } else {
        throw new Error('No dumps found to summarize for this period.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Summary generation failed'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    currentSummary,
    summaries,  // Add to return
    isLoading,
    error,
    generateSummary,
    clearError,
    setCurrentSummary
  }
}
