import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { DumpEntry } from '../lib/types'
import { hasActiveFilters, useFilter } from './useFilter'
import { toLocalDateKey } from '../lib/date-utils'

describe('useFilter', () => {
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

  it('filters by project and tag ids together', () => {
    const { result } = renderHook(() => useFilter())
    const matchingDump = createMockDump({ projectId: 'project-a', tags: ['tag-a', 'tag-b'] })
    const nonMatchingDump = createMockDump({ projectId: 'project-b', tags: ['tag-a'] })

    act(() => {
      result.current.setProjectFilter('project-a')
      result.current.toggleTagFilter('tag-a')
    })

    const filtered = result.current.applyFilters([matchingDump, nonMatchingDump])
    expect(filtered).toEqual([matchingDump])
  })

  it('applies preset date filters using local date keys', () => {
    const { result } = renderHook(() => useFilter())
    const todayDump = createMockDump({ createdAt: Date.now() })
    const oldDump = createMockDump({ createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000 })

    act(() => {
      result.current.setDatePreset('today')
    })

    const filtered = result.current.applyFilters([todayDump, oldDump])
    expect(filtered).toEqual([todayDump])
  })

  it('supports custom multi-date selection', () => {
    const { result } = renderHook(() => useFilter())
    const aprilEighth = new Date(2026, 3, 8, 10, 0, 0).getTime()
    const aprilNinth = new Date(2026, 3, 9, 10, 0, 0).getTime()
    const targetDateKey = toLocalDateKey(aprilEighth)
    const selectedDump = createMockDump({ createdAt: aprilEighth })
    const hiddenDump = createMockDump({ createdAt: aprilNinth })

    act(() => {
      result.current.setDateKeys([targetDateKey])
    })

    const filtered = result.current.applyFilters([selectedDump, hiddenDump])
    expect(filtered).toEqual([selectedDump])
  })

  it('reports whether filters are active', () => {
    const { result } = renderHook(() => useFilter())
    expect(hasActiveFilters(result.current.filters)).toBe(false)

    act(() => {
      result.current.toggleTagFilter('tag-a')
    })

    expect(hasActiveFilters(result.current.filters)).toBe(true)
  })
})
