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
const projectList: Project[] = [
  { id: 'project-1', name: 'Alpha', createdAt: 1 }
]
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
      onCreateProject={vi.fn(async () => {})}
      onUpdateProject={vi.fn(async () => {})}
      onDeleteProject={vi.fn(async () => {})}
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

  it('preserves the create-project input when creation fails', async () => {
    const onCreateProject = vi.fn(async () => {
      throw new Error('Project already exists')
    })

    renderSidebar({ onCreateProject })

    fireEvent.click(screen.getByLabelText('Create project'))

    const input = screen.getByPlaceholderText('Project name...')
    fireEvent.change(input, { target: { value: 'Alpha' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(onCreateProject).toHaveBeenCalledWith('Alpha')
    })

    expect(screen.getByText('Project already exists')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Alpha')).toBeInTheDocument()
  })

  it('preserves the edit input when renaming fails', async () => {
    const onUpdateProject = vi.fn(async () => {
      throw new Error('Rename failed')
    })

    renderSidebar({
      projects: projectList,
      onUpdateProject
    })

    fireEvent.contextMenu(screen.getByTitle('Alpha'))
    fireEvent.click(screen.getByText('Edit'))

    const input = screen.getByDisplayValue('Alpha')
    fireEvent.change(input, { target: { value: 'Alpha Draft' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(onUpdateProject).toHaveBeenCalledWith('project-1', 'Alpha Draft')
    })

    expect(screen.getByText('Rename failed')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Alpha Draft')).toBeInTheDocument()
  })

  it('keeps the context menu open when project deletion fails', async () => {
    const onDeleteProject = vi.fn(async () => {
      throw new Error('Delete failed')
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderSidebar({
      projects: projectList,
      onDeleteProject
    })

    fireEvent.contextMenu(screen.getByTitle('Alpha'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(onDeleteProject).toHaveBeenCalledWith('project-1')
    })

    expect(screen.getByText('Delete failed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })
})
