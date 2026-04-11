import { useState, useCallback } from 'react'
import type { DateFilterState, DatePreset, DumpEntry } from '@/shared/types'
import { getPresetDateKeys, toLocalDateKey } from '../lib/date-utils'

export interface FilterState {
  projectId: string | null
  tagIds: string[]
  dateFilter: DateFilterState
}

export interface UseFilterReturn {
  filters: FilterState
  setProjectFilter: (projectId: string | null) => void
  toggleTagFilter: (tagId: string) => void
  setDatePreset: (preset: DatePreset | null) => void
  toggleDate: (dateKey: string) => void
  setDateKeys: (dateKeys: string[]) => void
  clearDateFilter: () => void
  applyFilters: (dumps: DumpEntry[]) => DumpEntry[]
}

const EMPTY_DATE_FILTER: DateFilterState = {
  mode: 'all',
  preset: null,
  dates: []
}

function sortDateKeys(dateKeys: string[]): string[] {
  return [...new Set(dateKeys)].sort((a, b) => a.localeCompare(b))
}

export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.projectId !== null ||
    filters.tagIds.length > 0 ||
    filters.dateFilter.mode !== 'all'
  )
}

function matchesDateFilter(dump: DumpEntry, dateFilter: DateFilterState): boolean {
  if (dateFilter.mode === 'all') {
    return true
  }

  const dumpDateKey = toLocalDateKey(dump.createdAt)
  const selectedDates = dateFilter.mode === 'preset' && dateFilter.preset
    ? getPresetDateKeys(dateFilter.preset)
    : dateFilter.dates

  return selectedDates.includes(dumpDateKey)
}

export function useFilter(): UseFilterReturn {
  const [filters, setFilters] = useState<FilterState>({
    projectId: null,
    tagIds: [],
    dateFilter: EMPTY_DATE_FILTER
  })

  const setProjectFilter = useCallback((projectId: string | null) => {
    setFilters(prev => ({
      ...prev,
      projectId
    }))
  }, [])

  const toggleTagFilter = useCallback((tagId: string) => {
    setFilters(prev => {
      const hasTag = prev.tagIds.includes(tagId)
      return {
        ...prev,
        tagIds: hasTag
          ? prev.tagIds.filter(id => id !== tagId)
          : [...prev.tagIds, tagId]
      }
    })
  }, [])

  const setDatePreset = useCallback((preset: DatePreset | null) => {
    setFilters(prev => ({
      ...prev,
      dateFilter: prev.dateFilter.mode === 'preset' && prev.dateFilter.preset === preset
        ? EMPTY_DATE_FILTER
        : preset
          ? { mode: 'preset', preset, dates: [] }
          : EMPTY_DATE_FILTER
    }))
  }, [])

  const toggleDate = useCallback((dateKey: string) => {
    setFilters(prev => {
      const currentDates = prev.dateFilter.mode === 'dates' ? prev.dateFilter.dates : []
      const nextDates = currentDates.includes(dateKey)
        ? currentDates.filter(existing => existing !== dateKey)
        : [...currentDates, dateKey]

      return {
        ...prev,
        dateFilter: nextDates.length > 0
          ? { mode: 'dates', preset: null, dates: sortDateKeys(nextDates) }
          : EMPTY_DATE_FILTER
      }
    })
  }, [])

  const setDateKeys = useCallback((dateKeys: string[]) => {
    const nextDates = sortDateKeys(dateKeys)
    setFilters(prev => ({
      ...prev,
      dateFilter: nextDates.length > 0
        ? { mode: 'dates', preset: null, dates: nextDates }
        : EMPTY_DATE_FILTER
    }))
  }, [])

  const clearDateFilter = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      dateFilter: EMPTY_DATE_FILTER
    }))
  }, [])

  const applyFilters = useCallback((dumps: DumpEntry[]): DumpEntry[] => {
    let filtered = dumps.filter((dump) => {
      if (filters.projectId && dump.projectId !== filters.projectId) {
        return false
      }

      if (filters.tagIds.length > 0) {
        const hasAllTags = filters.tagIds.every(tagId => dump.tags.includes(tagId))
        if (!hasAllTags) return false
      }

      if (!matchesDateFilter(dump, filters.dateFilter)) {
        return false
      }

      return true
    })

    filtered.sort((a, b) => b.createdAt - a.createdAt)

    return filtered
  }, [filters])

  return {
    filters,
    setProjectFilter,
    toggleTagFilter,
    setDatePreset,
    toggleDate,
    setDateKeys,
    clearDateFilter,
    applyFilters
  }
}
