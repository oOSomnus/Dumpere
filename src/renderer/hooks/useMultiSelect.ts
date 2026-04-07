import { useCallback, useMemo, useState } from 'react'

export interface UseMultiSelectReturn {
  selectedIds: Set<string>
  isSelected: (id: string) => boolean
  toggle: (id: string) => void
  selectRange: (fromId: string, toId: string, allIds: string[]) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
  selectionCount: number
  lastSelectedId: string | null
  setLastSelectedId: (id: string | null) => void
}

export function useMultiSelect(): UseMultiSelectReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  )

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectRange = useCallback(
    (fromId: string, toId: string, allIds: string[]) => {
      const fromIndex = allIds.indexOf(fromId)
      const toIndex = allIds.indexOf(toId)

      if (fromIndex === -1 || toIndex === -1) return

      const start = Math.min(fromIndex, toIndex)
      const end = Math.max(fromIndex, toIndex)

      const rangeIds = allIds.slice(start, end + 1)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        rangeIds.forEach((id) => next.add(id))
        return next
      })
    },
    []
  )

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setLastSelectedId(null)
  }, [])

  const selectionCount = selectedIds.size

  return useMemo(
    () => ({
      selectedIds,
      isSelected,
      toggle,
      selectRange,
      selectAll,
      clearSelection,
      selectionCount,
      lastSelectedId,
      setLastSelectedId,
    }),
    [
      selectedIds,
      isSelected,
      toggle,
      selectRange,
      selectAll,
      clearSelection,
      selectionCount,
      lastSelectedId,
    ]
  )
}
