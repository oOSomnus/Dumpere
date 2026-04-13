import type { ComponentProps } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { Sidebar } from './Sidebar'
import type { DateFilterState, Project, Tag } from '../lib/types'
import { renderWithPrompt } from '../test-utils'
import { getTagColorForIndex } from '@/shared/tag-colors'

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
  { id: 'tag-1', name: 'urgent', createdAt: 1, color: getTagColorForIndex(0) },
  { id: 'tag-2', name: 'bug', createdAt: 2, color: getTagColorForIndex(1) }
]

function renderSidebar(overrides: Partial<ComponentProps<typeof Sidebar>> = {}) {
  return renderWithPrompt(
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

    renderSidebar({ onDeleteTag })

    fireEvent.click(screen.getByLabelText('Delete tag urgent'))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Tag' }))

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

    renderSidebar({
      projects: projectList,
      onDeleteProject
    })

    fireEvent.contextMenu(screen.getByTitle('Alpha'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Project' }))

    await waitFor(() => {
      expect(onDeleteProject).toHaveBeenCalledWith('project-1')
    })

    expect(screen.getByText('Delete failed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('shows the app-styled project delete confirmation dialog', async () => {
    renderSidebar({
      projects: projectList
    })

    fireEvent.contextMenu(screen.getByTitle('Alpha'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText("Delete project 'Alpha'?")).toBeInTheDocument()
    expect(screen.getByText('Dumps will be moved to Unassigned. This cannot be undone.')).toBeInTheDocument()
  })

  it('renders tag color swatches in the sidebar', () => {
    renderSidebar()

    const swatches = document.querySelectorAll('span.h-2\\.5.w-2\\.5')
    expect(swatches.length).toBeGreaterThan(0)
  })
})
