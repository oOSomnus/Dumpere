import { useState, ReactNode } from 'react'
import { DumpEntry, Project, Tag } from '../lib/types'
import { DumpCard } from './DumpCard'
import { ExpandedCard } from './ExpandedCard'
import { EmptyState } from './EmptyState'
import { FilterState } from '../hooks/useFilter'
import { useMultiSelect } from '../hooks/useMultiSelect'
import { FloatingActionBar } from './FloatingActionBar'
import { SearchResult } from '../hooks/useSearch'
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable'
import { SortableDumpCard } from './SortableDumpCard'

interface CardGridProps {
  dumps: DumpEntry[]
  onDelete: (id: string) => void
  isLoading?: boolean
  filters?: FilterState
  onReorder?: (dumps: DumpEntry[]) => void
  dumpOrder?: string[]
  applyFilters?: (dumps: DumpEntry[], dumpOrder?: string[]) => DumpEntry[]
  // Phase 3: search highlighting
  searchResults?: SearchResult[]  // from useSearch hook
  searchQuery?: string            // current search term
  // Phase 3: multi-select export
  onExportSelected?: (dumpIds: string[]) => void
  // Phase 6: project/tag editing in ExpandedCard
  projects: Project[]
  tags: Tag[]
  onProjectChange: (dumpId: string, projectId: string | null) => void
  onTagsChange: (dumpId: string, tagIds: string[]) => void
}

export function CardGrid({
  dumps,
  onDelete,
  isLoading,
  filters,
  onReorder,
  dumpOrder = [],
  applyFilters,
  searchResults,
  searchQuery,
  onExportSelected,
  projects,
  tags,
  onProjectChange,
  onTagsChange
}: CardGridProps) {
  const [selectedDump, setSelectedDump] = useState<DumpEntry | null>(null)

  // Multi-select hook (EXPT-01)
  const multiSelect = useMultiSelect()

  // Sensors for drag and drop (ORGA-04)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Apply filters if filter functions provided
  // When searchQuery is active, use searchResults; otherwise use filter logic
  const filteredDumps = (() => {
    if (searchQuery && searchResults && searchResults.length > 0) {
      // Search active: show only matching dumps from searchResults
      return searchResults.map(r => r.dump)
    }
    if (applyFilters && filters) {
      return applyFilters(dumps, dumpOrder)
    }
    // Default: sort by createdAt descending
    return [...dumps].sort((a, b) => b.createdAt - a.createdAt)
  })()

  // Build a map of dump id -> SearchResult for quick lookup
  const searchResultMap = new Map<string, SearchResult>(
    (searchResults || []).map(r => [r.dump.id, r])
  )

  // Escape regex special characters
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // Render highlighted text with <mark> tags around matched terms
  const renderHighlightedText = (dumpId: string, matchedText: string, query: string): ReactNode => {
    if (!query) return matchedText
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi')
    const parts = matchedText.split(regex)
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i}>{part}</mark> : part
    )
  }

  // Handle drag end (ORGA-04)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id && onReorder) {
      const oldIndex = filteredDumps.findIndex(d => d.id === active.id)
      const newIndex = filteredDumps.findIndex(d => d.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(filteredDumps, oldIndex, newIndex)
        onReorder(newOrder)
      }
    }
  }

  // Handle card click with shift+click range selection (EXPT-01)
  const allVisibleIds = filteredDumps.map(d => d.id)
  const handleCardClick = (dump: DumpEntry, e: React.MouseEvent) => {
    if (e.shiftKey && multiSelect.lastSelectedId) {
      multiSelect.selectRange(multiSelect.lastSelectedId, dump.id, allVisibleIds)
    } else {
      setSelectedDump(dump)
    }
  }

  // Handle export of selected dumps (EXPT-01)
  const handleExportSelected = () => {
    if (onExportSelected) {
      onExportSelected(Array.from(multiSelect.selectedIds))
    }
  }

  if (isLoading && dumps.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: '200px' }}>
        <span style={{ color: 'var(--muted-foreground)' }}>Loading...</span>
      </div>
    )
  }

  if (filteredDumps.length === 0) {
    return <EmptyState />
  }

  // Determine if we should use sortable cards
  const useSortable = Boolean(onReorder)

  const renderCards = () => (
    <div
      className="grid w-full"
      style={{
        // D-06: Responsive columns
        // < 640px: 2 columns
        // 640px - 1024px: 3 columns
        // > 1024px: 4 columns
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        alignItems: 'start'
      }}
    >
      {filteredDumps.map(dump => {
        const searchResult = searchResultMap.get(dump.id)
        const highlighted = searchResult
          ? renderHighlightedText(dump.id, searchResult.matchedText, searchQuery || '')
          : undefined
        return (
          <DumpCard
            key={dump.id}
            dump={dump}
            onDelete={onDelete}
            showCheckbox={true}
            isSelected={multiSelect.isSelected(dump.id)}
            onSelectToggle={(id) => {
              multiSelect.toggle(id)
              multiSelect.setLastSelectedId(id)
            }}
            onClick={(e) => handleCardClick(dump, e as unknown as React.MouseEvent)}
            highlightedText={highlighted}
          />
        )
      })}
    </div>
  )

  const renderSortableCards = () => (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={filteredDumps.map(d => d.id)}
        strategy={rectSortingStrategy}
      >
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            alignItems: 'start'
          }}
        >
          {filteredDumps.map(dump => {
            const searchResult = searchResultMap.get(dump.id)
            const highlighted = searchResult
              ? renderHighlightedText(dump.id, searchResult.matchedText, searchQuery || '')
              : undefined
            return (
              <SortableDumpCard
                key={dump.id}
                dump={dump}
                onDelete={onDelete}
                showCheckbox={true}
                isSelected={multiSelect.isSelected(dump.id)}
                onSelectToggle={(id) => {
                  multiSelect.toggle(id)
                  multiSelect.setLastSelectedId(id)
                }}
                onClick={(e) => handleCardClick(dump, e as unknown as React.MouseEvent)}
                highlightedText={highlighted}
              />
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )

  return (
    <>
      {useSortable ? renderSortableCards() : renderCards()}

      {/* Expanded card view */}
      <ExpandedCard
        dump={selectedDump}
        onClose={() => setSelectedDump(null)}
        projects={projects}
        tags={tags}
        onProjectChange={onProjectChange}
        onTagsChange={onTagsChange}
      />

      {/* Floating action bar for multi-select (EXPT-01) */}
      <FloatingActionBar
        selectionCount={multiSelect.selectionCount}
        onExport={() => handleExportSelected(multiSelect.selectedIds)}
        onDismiss={multiSelect.clearSelection}
      />
    </>
  )
}
