import type { ComponentProps } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Sidebar } from './Sidebar'
import type { DateFilterState, Project, Tag } from '../lib/types'

vi.mock('./DateFilterPopover', () => ({
  DateFilterPopover: () => <div>Date Filter</div>
}))

const dateFilter: DateFilterState = {
  mode: 'all',
  preset: null,
  dates: []
}

const projects: Project[] = []
const tags: Tag[] = [
  { id: 'tag-1', name: 'urgent', createdAt: 1 },
  { id: 'tag-2', name: 'bug', createdAt: 2 }
]

function renderSidebar(overrides: Partial<ComponentProps<typeof Sidebar>> = {}) {
  return render(
    <Sidebar
      projects={projects}
      tags={tags}
      activeProjectId={null}
      selectedTagIds={[]}
      dateFilter={dateFilter}
      onProjectSelect={vi.fn()}
      onTagToggle={vi.fn()}
      onDeleteTag={vi.fn(async () => {})}
      onDatePresetChange={vi.fn()}
      onToggleDate={vi.fn()}
      onSetDateKeys={vi.fn()}
      onClearDateFilter={vi.fn()}
      onCreateProject={vi.fn()}
      onUpdateProject={vi.fn()}
      onDeleteProject={vi.fn()}
      onViewChange={vi.fn()}
      {...overrides}
    />
  )
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('toggles a tag filter when a tag label is clicked', () => {
    const onTagToggle = vi.fn()
    renderSidebar({ onTagToggle })

    fireEvent.click(screen.getByLabelText('Toggle tag filter bug'))

    expect(onTagToggle).toHaveBeenCalledWith('tag-2')
  })

  it('deletes a tag from the sidebar after confirmation', async () => {
    const onDeleteTag = vi.fn(async () => {})
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderSidebar({ onDeleteTag })

    fireEvent.click(screen.getByLabelText('Delete tag urgent'))

    await waitFor(() => {
      expect(onDeleteTag).toHaveBeenCalledWith('tag-1')
    })
  })

  it('reports search input focus changes', () => {
    const onSearchFocusChange = vi.fn()
    renderSidebar({
      searchQuery: '',
      onSearchChange: vi.fn(),
      onSearchFocusChange
    })

    const searchInput = screen.getByPlaceholderText('Search dumps...')
    fireEvent.focus(searchInput)
    fireEvent.blur(searchInput)

    expect(onSearchFocusChange).toHaveBeenNthCalledWith(1, true)
    expect(onSearchFocusChange).toHaveBeenNthCalledWith(2, false)
  })
})
