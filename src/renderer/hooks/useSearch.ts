import { useState, useCallback, useRef, useEffect } from 'react'
import { DumpEntry } from '../lib/types'

export interface SearchResult {
  dump: DumpEntry
  matchedText: string      // The text snippet containing the match
  matchStart: number       // Start index of match in full text
  matchEnd: number         // End index of match in full text
}

export interface UseSearchReturn {
  searchQuery: string
  setSearchQuery: (query: string) => void
  search: (query: string, dumps: DumpEntry[]) => SearchResult[]
  getHighlightedText: (text: string, matchStart: number, matchEnd: number) => string
}

const CONTEXT_CHARS = 50
const DEBOUNCE_MS = 200

/**
 * Search hook for filtering dumps by text content.
 * Provides debounced search query and search results with context.
 */
export function useSearch(): UseSearchReturn {
  const [searchQuery, setSearchQueryState] = useState('')
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced setter for search query
  const setSearchQuery = useCallback((query: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      setSearchQueryState(query)
    }, DEBOUNCE_MS)
  }, [])

  /**
   * Search through dumps for matching text.
   * Returns results with context (50 chars before/after match).
   */
  const search = useCallback((query: string, dumps: DumpEntry[]): SearchResult[] => {
    if (!query.trim()) {
      return []
    }

    const lowerQuery = query.toLowerCase()
    const results: SearchResult[] = []

    for (const dump of dumps) {
      const text = dump.text
      const lowerText = text.toLowerCase()
      const matchIndex = lowerText.indexOf(lowerQuery)

      if (matchIndex !== -1) {
        // Calculate context boundaries
        const matchStart = matchIndex
        const matchEnd = matchIndex + query.length

        // Extract context before match
        const contextStart = Math.max(0, matchStart - CONTEXT_CHARS)
        const beforeContext = text.slice(contextStart, matchStart)

        // Extract context after match
        const contextEnd = Math.min(text.length, matchEnd + CONTEXT_CHARS)
        const afterContext = text.slice(matchEnd, contextEnd)

        // Build matched text with context
        const matchedText = (contextStart > 0 ? '...' : '') +
          beforeContext +
          text.slice(matchStart, matchEnd) +
          afterContext +
          (contextEnd < text.length ? '...' : '')

        results.push({
          dump,
          matchedText,
          matchStart,
          matchEnd,
        })
      }
    }

    return results
  }, [])

  /**
   * Get highlighted text snippet for display.
   * Returns the text with context around the match.
   */
  const getHighlightedText = useCallback((
    text: string,
    matchStart: number,
    matchEnd: number
  ): string => {
    const contextStart = Math.max(0, matchStart - CONTEXT_CHARS)
    const contextEnd = Math.min(text.length, matchEnd + CONTEXT_CHARS)

    const before = contextStart > 0 ? '...' : ''
    const after = contextEnd < text.length ? '...' : ''

    return before + text.slice(contextStart, contextEnd) + after
  }, [])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    searchQuery,
    setSearchQuery,
    search,
    getHighlightedText,
  }
}
