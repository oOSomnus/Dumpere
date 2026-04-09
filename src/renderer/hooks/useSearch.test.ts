import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { DumpEntry } from '../lib/types'
import { useSearch } from './useSearch'

describe('useSearch', () => {
  const createMockDump = (overrides: Partial<DumpEntry> = {}): DumpEntry => ({
    id: crypto.randomUUID(),
    text: 'Test dump',
    files: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    projectId: null,
    tags: [],
    ...overrides
  })

  it('matches dumps when all query terms are present without requiring an exact phrase', () => {
    const { result } = renderHook(() => useSearch())
    const matchingDump = createMockDump({ text: 'React app search input occasionally loses focus' })
    const nonMatchingDump = createMockDump({ text: 'React app sidebar filter' })

    const searchResults = result.current.search('search focus', [matchingDump, nonMatchingDump])

    expect(searchResults).toHaveLength(1)
    expect(searchResults[0]?.dump.id).toBe(matchingDump.id)
  })

  it('ignores repeated whitespace in the query', () => {
    const { result } = renderHook(() => useSearch())
    const matchingDump = createMockDump({ text: 'search input with extra spaces in query' })

    const searchResults = result.current.search('  search   query  ', [matchingDump])

    expect(searchResults).toHaveLength(1)
  })
})
