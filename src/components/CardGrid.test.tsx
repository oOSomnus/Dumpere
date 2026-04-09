import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CardGrid } from '../renderer/components/CardGrid'
import { DumpEntry, Project, Tag, type DateFilterState } from '../renderer/lib/types'

vi.mock('../renderer/lib/date-utils', () => ({
  formatTimelineDate: vi.fn(() => 'Apr 8'),
  formatTimelineTime: vi.fn(() => '09:30'),
}))

describe('CardGrid', () => {
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

  const mockProjects: Project[] = []
  const mockTags: Tag[] = []
  const mockOnDelete = vi.fn(async () => {})
  const mockOnProjectChange = vi.fn()
  const mockOnTagsChange = vi.fn()
  const emptyDateFilter: DateFilterState = { mode: 'all', preset: null, dates: [] }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders timeline labels when there are no active filters or search', () => {
    render(
      <CardGrid
        dumps={[createMockDump({ id: '1', text: 'Timeline dump' })]}
        onDelete={mockOnDelete}
        projects={mockProjects}
        tags={mockTags}
        onProjectChange={mockOnProjectChange}
        onTagsChange={mockOnTagsChange}
      />
    )

    expect(screen.getByText('Apr 8')).toBeInTheDocument()
    expect(screen.getByText('09:30')).toBeInTheDocument()
  })

  it('keeps the timeline view for a project all-time filter', () => {
    render(
      <CardGrid
        dumps={[createMockDump({ id: '1', text: 'Filtered dump', projectId: 'project-a' })]}
        onDelete={mockOnDelete}
        filters={{ projectId: 'project-a', tagIds: [], dateFilter: emptyDateFilter, sortBy: 'createdAt' }}
        applyFilters={(dumps) => dumps}
        projects={mockProjects}
        tags={mockTags}
        onProjectChange={mockOnProjectChange}
        onTagsChange={mockOnTagsChange}
      />
    )

    expect(screen.getByText('Apr 8')).toBeInTheDocument()
    expect(screen.getByText('09:30')).toBeInTheDocument()
    expect(screen.getByText('Filtered dump')).toBeInTheDocument()
  })

  it('switches to flat card view when a non-project filter is active', () => {
    render(
      <CardGrid
        dumps={[createMockDump({ id: '1', text: 'Tagged dump', projectId: 'project-a', tags: ['tag-a'] })]}
        onDelete={mockOnDelete}
        filters={{
          projectId: 'project-a',
          tagIds: ['tag-a'],
          dateFilter: emptyDateFilter,
          sortBy: 'createdAt'
        }}
        applyFilters={(dumps) => dumps}
        projects={mockProjects}
        tags={mockTags}
        onProjectChange={mockOnProjectChange}
        onTagsChange={mockOnTagsChange}
      />
    )

    expect(screen.queryByText('Apr 8')).toBeNull()
    expect(screen.getByText('Tagged dump')).toBeInTheDocument()
  })

  it('supports quoting and deleting selected dumps', async () => {
    const onQuoteSelected = vi.fn(async () => {})
    const firstDump = createMockDump({ id: 'dump-1', text: 'First dump' })
    const secondDump = createMockDump({ id: 'dump-2', text: 'Second dump' })

    render(
      <CardGrid
        dumps={[firstDump, secondDump]}
        onDelete={mockOnDelete}
        onQuoteSelected={onQuoteSelected}
        projects={mockProjects}
        tags={mockTags}
        onProjectChange={mockOnProjectChange}
        onTagsChange={mockOnTagsChange}
      />
    )

    fireEvent.click(screen.getByLabelText('Select dump dump-1'))
    fireEvent.click(screen.getByLabelText('Select dump dump-2'))

    expect(screen.getByText('2 selected')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Quote'))
    await waitFor(() => {
      expect(onQuoteSelected).toHaveBeenCalledWith([firstDump, secondDump])
    })

    fireEvent.click(screen.getByLabelText('Select dump dump-1'))
    fireEvent.click(screen.getByLabelText('Select dump dump-2'))
    fireEvent.click(screen.getByText('Delete'))
    fireEvent.click(screen.getByText('Delete Selected'))

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('dump-1')
      expect(mockOnDelete).toHaveBeenCalledWith('dump-2')
    })
  })
})
