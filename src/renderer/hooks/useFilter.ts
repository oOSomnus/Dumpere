import { useState, useCallback } from 'react'
import { DumpEntry } from '../lib/types'

export interface FilterState {
  projectId: string | null  // null = All Projects
  tagIds: string[]           // empty = All Tags
  timeRange: 'today' | 'week' | 'month' | null  // null = All Time
  sortBy: 'createdAt' | 'custom'  // chronological vs custom order
}

export interface UseFilterReturn {
  filters: FilterState
  setProjectFilter: (projectId: string | null) => void
  toggleTagFilter: (tagId: string) => void
  setTimeRangeFilter: (range: 'today' | 'week' | 'month' | null) => void
  setSortBy: (sort: 'createdAt' | 'custom') => void
  applyFilters: (dumps: DumpEntry[], dumpOrder?: string[]) => DumpEntry[]
}

function getTimeRangeStart(range: 'today' | 'week' | 'month'): number {
  const now = Date.now()
  switch (range) {
    case 'today':
      return new Date().setHours(0, 0, 0, 0)
    case 'week':
      return new Date().setDate(new Date().getDate() - 7)
    case 'month':
      return new Date().setMonth(new Date().getMonth() - 1)
  }
}

export function useFilter(): UseFilterReturn {
  const [filters, setFilters] = useState<FilterState>({
    projectId: null,
    tagIds: [],
    timeRange: null,
    sortBy: 'createdAt'
  })

  const setProjectFilter = useCallback((projectId: string | null) => {
    setFilters(prev => ({
      ...prev,
      // Toggle off if same project clicked
      projectId: prev.projectId === projectId ? null : projectId
    }))
  }, [])

  const toggleTagFilter = useCallback((tagId: string) => {
    setFilters(prev => {
      const hasTag = prev.tagIds.includes(tagId)
      return {
        ...prev,
        // Checkbox behavior: add if not present, remove if present
        tagIds: hasTag
          ? prev.tagIds.filter(id => id !== tagId)
          : [...prev.tagIds, tagId]
      }
    })
  }, [])

  const setTimeRangeFilter = useCallback((range: 'today' | 'week' | 'month' | null) => {
    setFilters(prev => ({
      ...prev,
      // Toggle off if same range clicked
      timeRange: prev.timeRange === range ? null : range
    }))
  }, [])

  const setSortBy = useCallback((sort: 'createdAt' | 'custom') => {
    setFilters(prev => ({ ...prev, sortBy: sort }))
  }, [])

  const applyFilters = useCallback((dumps: DumpEntry[], dumpOrder: string[] = []): DumpEntry[] => {
    let filtered = dumps.filter(dump => {
      // Project filter (ORGA-01)
      if (filters.projectId && dump.projectId !== filters.projectId) {
        return false
      }

      // Tag filter with AND logic (ORGA-02, ORGA-05)
      // All selected tags must be present (every, not some)
      if (filters.tagIds.length > 0) {
        const hasAllTags = filters.tagIds.every(tagId => dump.tags.includes(tagId))
        if (!hasAllTags) return false
      }

      // Time range filter (ORGA-03)
      if (filters.timeRange) {
        const startOf = getTimeRangeStart(filters.timeRange)
        if (dump.createdAt < startOf) return false
      }

      return true
    })

    // Sorting (ORGA-04)
    if (filters.sortBy === 'custom' && dumpOrder.length > 0) {
      // Sort by dumpOrder array position
      // Items not in dumpOrder go at the end (sorted by createdAt)
      const orderedDumps: { dump: DumpEntry; orderIndex: number }[] = []
      const unorderedDumps: DumpEntry[] = []

      filtered.forEach(dump => {
        const orderIndex = dumpOrder.indexOf(dump.id)
        if (orderIndex !== -1) {
          orderedDumps.push({ dump, orderIndex })
        } else {
          unorderedDumps.push(dump)
        }
      })

      // Sort ordered items by their position in dumpOrder
      orderedDumps.sort((a, b) => a.orderIndex - b.orderIndex)
      // Sort unordered by createdAt descending
      unorderedDumps.sort((a, b) => b.createdAt - a.createdAt)

      filtered = [...orderedDumps.map(o => o.dump), ...unorderedDumps]
    } else {
      // Default: sort by createdAt descending (newest first)
      filtered.sort((a, b) => b.createdAt - a.createdAt)
    }

    return filtered
  }, [filters])

  return {
    filters,
    setProjectFilter,
    toggleTagFilter,
    setTimeRangeFilter,
    setSortBy,
    applyFilters
  }
}
