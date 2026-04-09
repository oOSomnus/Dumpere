import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { DumpEntry, Project, Tag } from '../lib/types'
import { DumpCard } from './DumpCard'
import { ExpandedCard } from './ExpandedCard'
import { EmptyState } from './EmptyState'
import { ConfirmDialog } from './ConfirmDialog'
import { FilterState } from '../hooks/useFilter'
import { useMultiSelect } from '../hooks/useMultiSelect'
import { FloatingActionBar } from './FloatingActionBar'
import { SearchResult } from '../hooks/useSearch'
import { formatTimelineDate, formatTimelineTime } from '../lib/date-utils'

interface CardGridProps {
  dumps: DumpEntry[]
  onDelete: (id: string) => Promise<void> | void
  isLoading?: boolean
  filters?: FilterState
  applyFilters?: (dumps: DumpEntry[], dumpOrder?: string[]) => DumpEntry[]
  searchResults?: SearchResult[]
  searchQuery?: string
  onExportSelected?: (dumpIds: string[]) => Promise<void> | void
  onQuoteSelected?: (dumps: DumpEntry[]) => Promise<void> | void
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
  applyFilters,
  searchResults,
  searchQuery,
  onExportSelected,
  onQuoteSelected,
  projects,
  tags,
  onProjectChange,
  onTagsChange
}: CardGridProps) {
  const [selectedDump, setSelectedDump] = useState<DumpEntry | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const multiSelect = useMultiSelect()

  const searchActive = Boolean(searchQuery && searchQuery.trim())
  const showTimelineView = !searchActive && (
    !filters ||
    (
      filters.tagIds.length === 0 &&
      filters.dateFilter.mode === 'all'
    )
  )

  const filteredDumps = useMemo(() => {
    if (searchActive && searchResults) {
      return searchResults.map(result => result.dump)
    }

    if (applyFilters && filters) {
      return applyFilters(dumps)
    }

    return [...dumps].sort((a, b) => b.createdAt - a.createdAt)
  }, [applyFilters, dumps, filters, searchActive, searchResults])

  const allVisibleIds = useMemo(
    () => filteredDumps.map(dump => dump.id),
    [filteredDumps]
  )

  const searchResultMap = useMemo(
    () => new Map<string, SearchResult>((searchResults || []).map(result => [result.dump.id, result])),
    [searchResults]
  )

  const projectNameById = useMemo(
    () => new Map(projects.map(project => [project.id, project.name])),
    [projects]
  )

  const tagById = useMemo(
    () => new Map(tags.map(tag => [tag.id, tag])),
    [tags]
  )

  useEffect(() => {
    multiSelect.clearSelection()
  }, [
    multiSelect.clearSelection,
    searchQuery,
    filters?.projectId,
    filters?.tagIds.join('|'),
    filters?.dateFilter.mode,
    filters?.dateFilter.preset,
    filters?.dateFilter.dates.join('|')
  ])

  useEffect(() => {
    if (selectedDump && !allVisibleIds.includes(selectedDump.id)) {
      setSelectedDump(null)
    }
  }, [allVisibleIds, selectedDump])

  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const renderHighlightedText = (matchedText: string, query: string): ReactNode => {
    if (!query) return matchedText
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi')
    const parts = matchedText.split(regex)
    const normalizedQuery = query.toLowerCase()

    return parts.map((part, index) => (
      part.toLowerCase() === normalizedQuery ? <mark key={index}>{part}</mark> : part
    ))
  }

  const getSelectedDumps = () => {
    const selectedIdSet = multiSelect.selectedIds
    return filteredDumps.filter(dump => selectedIdSet.has(dump.id))
  }

  const handleCardClick = (dump: DumpEntry, event: MouseEvent<HTMLDivElement>) => {
    if (event.shiftKey && multiSelect.lastSelectedId) {
      multiSelect.selectRange(multiSelect.lastSelectedId, dump.id, allVisibleIds)
      multiSelect.setLastSelectedId(dump.id)
      return
    }

    setSelectedDump(dump)
  }

  const handleExportSelected = async () => {
    if (!onExportSelected) return
    await onExportSelected(Array.from(multiSelect.selectedIds))
    multiSelect.clearSelection()
  }

  const handleQuoteSelected = async () => {
    if (!onQuoteSelected) return
    await onQuoteSelected(getSelectedDumps())
    multiSelect.clearSelection()
  }

  const handleDeleteSelected = async () => {
    const selectedIds = Array.from(multiSelect.selectedIds)
    for (const selectedId of selectedIds) {
      await onDelete(selectedId)
    }
    multiSelect.clearSelection()
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

  const renderCard = (dump: DumpEntry) => {
    const searchResult = searchResultMap.get(dump.id)
    const highlighted = searchResult
      ? renderHighlightedText(searchResult.matchedText, searchQuery || '')
      : undefined

    return (
      <DumpCard
        key={dump.id}
        dump={dump}
        onDelete={onDelete}
        onClick={(event) => handleCardClick(dump, event)}
        showCheckbox={true}
        isSelected={multiSelect.isSelected(dump.id)}
        onSelectToggle={(id) => {
          multiSelect.toggle(id)
          multiSelect.setLastSelectedId(id)
        }}
        projectName={dump.projectId ? projectNameById.get(dump.projectId) : undefined}
        tags={dump.tags.map(tagId => tagById.get(tagId)).filter(Boolean) as Tag[]}
        highlightedText={highlighted}
      />
    )
  }

  return (
    <>
      {showTimelineView ? (
        <div className="relative">
          <div
            className="absolute top-0 bottom-0"
            style={{
              left: '95px',
              width: '1px',
              backgroundColor: 'var(--border)'
            }}
          />

          <div className="space-y-6">
            {filteredDumps.map((dump) => (
              <div
                key={dump.id}
                className="grid gap-4"
                style={{ gridTemplateColumns: '80px minmax(0, 1fr)' }}
              >
                <div className="pt-3 text-right">
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                    {formatTimelineTime(dump.createdAt)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {formatTimelineDate(dump.createdAt)}
                  </p>
                </div>

                <div className="relative pl-6">
                  <div
                    className="absolute top-6 rounded-full border-2"
                    style={{
                      left: '-7px',
                      width: '14px',
                      height: '14px',
                      backgroundColor: 'var(--background)',
                      borderColor: 'var(--accent)'
                    }}
                  />
                  {renderCard(dump)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            alignItems: 'start'
          }}
        >
          {filteredDumps.map(renderCard)}
        </div>
      )}

      <ExpandedCard
        dump={selectedDump}
        onClose={() => setSelectedDump(null)}
        projects={projects}
        tags={tags}
        onProjectChange={onProjectChange}
        onTagsChange={onTagsChange}
        onQuoteToWorkpad={onQuoteSelected ? async (dump) => onQuoteSelected([dump]) : undefined}
      />

      <FloatingActionBar
        selectionCount={multiSelect.selectionCount}
        onExport={handleExportSelected}
        onDelete={() => setShowDeleteConfirm(true)}
        onQuote={onQuoteSelected ? handleQuoteSelected : undefined}
        onDismiss={multiSelect.clearSelection}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={`Delete ${multiSelect.selectionCount} dumps?`}
        description="This will permanently remove all selected dumps and their attachments."
        confirmLabel="Delete Selected"
        onConfirm={() => {
          void handleDeleteSelected()
        }}
        destructive
      />
    </>
  )
}
