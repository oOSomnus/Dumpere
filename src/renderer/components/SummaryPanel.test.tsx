import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import type { Project, SummaryEntry, DumpEntry, Tag } from '../lib/types'
import { mockElectronAPI } from '../lib/types'
import { renderWithPrompt } from '../test-utils'

vi.mock('../hooks/useSummary', () => ({
  useSummary: vi.fn()
}))

vi.mock('../hooks/useWorkspaceTree', () => ({
  useWorkspaceTree: vi.fn()
}))

vi.mock('../hooks/useWorkspaceNote', () => ({
  useWorkspaceNote: vi.fn()
}))

vi.mock('../lib/utils-time', () => ({
  formatRelativeTime: vi.fn(() => '2 hours ago')
}))

import { SummaryPanel } from './SummaryPanel'
import { useSummary } from '../hooks/useSummary'
import { useWorkspaceTree } from '../hooks/useWorkspaceTree'
import { useWorkspaceNote } from '../hooks/useWorkspaceNote'

describe('SummaryPanel', () => {
  const summary: SummaryEntry = {
    id: 'summary-1',
    type: 'daily',
    projectId: 'project-1',
    generatedAt: Date.now(),
    content: '# Summary\n\n- Finished implementation',
    dumpCount: 3
  }

  const projects: Project[] = [
    { id: 'project-1', name: 'Alpha', createdAt: Date.now() },
    { id: 'project-2', name: 'Beta', createdAt: Date.now() + 1 }
  ]

  const dumps: DumpEntry[] = [
    { id: 'dump-1', text: 'Reference dump', files: [], createdAt: Date.now(), updatedAt: Date.now(), projectId: 'project-1', tags: [] }
  ]

  const tags: Tag[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(mockElectronAPI.data, 'exportSummary').mockResolvedValue('/tmp/summary.md')

    ;(useSummary as ReturnType<typeof vi.fn>).mockReturnValue({
      currentSummary: summary,
      summaries: [summary],
      isLoading: false,
      error: null,
      generateSummary: vi.fn().mockResolvedValue(undefined),
      clearError: vi.fn(),
      setCurrentSummary: vi.fn()
    })

    ;(useWorkspaceTree as ReturnType<typeof vi.fn>).mockReturnValue({
      tree: [
        { type: 'note', name: 'index.md', path: 'index.md' }
      ],
      isLoading: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined),
      createFolder: vi.fn().mockResolvedValue(undefined),
      createNote: vi.fn().mockResolvedValue({ projectId: 'project-1', path: 'index.md', content: '', updatedAt: Date.now() }),
      renameEntry: vi.fn().mockResolvedValue({ path: 'index.md' }),
      deleteEntry: vi.fn().mockResolvedValue(undefined),
      notePaths: ['index.md']
    })

    ;(useWorkspaceNote as ReturnType<typeof vi.fn>).mockReturnValue({
      note: { projectId: 'project-1', path: 'index.md', content: '## Notes', updatedAt: Date.now() },
      content: '## Notes',
      setContent: vi.fn(),
      isLoading: false,
      isSaving: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined),
      saveNow: vi.fn().mockResolvedValue({ projectId: 'project-1', path: 'index.md', content: '## Notes', updatedAt: Date.now() })
    })
  })

  it('renders the workspace editor and current summary', () => {
    renderWithPrompt(
      <SummaryPanel
        projects={projects}
        dumps={dumps}
        tags={tags}
        activeProjectId="project-1"
        activeNotePaths={{ 'project-1': 'index.md' }}
        onActiveNotePathChange={vi.fn()}
        onProjectChange={vi.fn()}
        onTagsChange={vi.fn()}
      />
    )

    expect(screen.getByText('Project Workspace')).toBeInTheDocument()
    expect(screen.getByDisplayValue('## Notes')).toBeInTheDocument()
    expect(screen.getByText('Finished implementation')).toBeInTheDocument()
  })

  it('saves the note before generating a summary and refreshes afterward', async () => {
    const saveNow = vi.fn().mockResolvedValue({ projectId: 'project-1', path: 'index.md', content: '## Notes', updatedAt: Date.now() })
    const refreshTree = vi.fn().mockResolvedValue(undefined)
    const refreshNote = vi.fn().mockResolvedValue(undefined)
    const generateSummary = vi.fn().mockResolvedValue(undefined)

    ;(useSummary as ReturnType<typeof vi.fn>).mockReturnValue({
      currentSummary: summary,
      summaries: [summary],
      isLoading: false,
      error: null,
      generateSummary,
      clearError: vi.fn(),
      setCurrentSummary: vi.fn()
    })

    ;(useWorkspaceTree as ReturnType<typeof vi.fn>).mockReturnValue({
      tree: [{ type: 'note', name: 'index.md', path: 'index.md' }],
      isLoading: false,
      error: null,
      refresh: refreshTree,
      createFolder: vi.fn(),
      createNote: vi.fn(),
      renameEntry: vi.fn(),
      deleteEntry: vi.fn(),
      notePaths: ['index.md']
    })

    ;(useWorkspaceNote as ReturnType<typeof vi.fn>).mockReturnValue({
      note: { projectId: 'project-1', path: 'index.md', content: '## Notes', updatedAt: Date.now() },
      content: '## Notes',
      setContent: vi.fn(),
      isLoading: false,
      isSaving: false,
      error: null,
      refresh: refreshNote,
      saveNow
    })

    renderWithPrompt(
      <SummaryPanel
        projects={projects}
        dumps={dumps}
        tags={tags}
        activeProjectId="project-1"
        activeNotePaths={{ 'project-1': 'index.md' }}
        onActiveNotePathChange={vi.fn()}
        onProjectChange={vi.fn()}
        onTagsChange={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText('Generate Summary'))

    await waitFor(() => {
      expect(saveNow).toHaveBeenCalled()
      expect(generateSummary).toHaveBeenCalledWith('daily', 'project-1')
      expect(refreshTree).toHaveBeenCalled()
      expect(refreshNote).toHaveBeenCalled()
    })
  })

  it('exports the current summary', async () => {
    renderWithPrompt(
      <SummaryPanel
        projects={projects}
        dumps={dumps}
        tags={tags}
        activeProjectId="project-1"
        activeNotePaths={{ 'project-1': 'index.md' }}
        onActiveNotePathChange={vi.fn()}
        onProjectChange={vi.fn()}
        onTagsChange={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText('Export'))

    await waitFor(() => {
      expect(mockElectronAPI.data.exportSummary).toHaveBeenCalledWith('summary-1')
    })
  })

  it('switches the workspace note into preview mode', () => {
    renderWithPrompt(
      <SummaryPanel
        projects={projects}
        dumps={dumps}
        tags={tags}
        activeProjectId="project-1"
        activeNotePaths={{ 'project-1': 'index.md' }}
        onActiveNotePathChange={vi.fn()}
        onProjectChange={vi.fn()}
        onTagsChange={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText('Preview'))

    expect(screen.getByText('Notes')).toBeInTheDocument()
  })

  it('shows a project-selection message in all-projects mode', () => {
    renderWithPrompt(
      <SummaryPanel
        projects={projects}
        dumps={dumps}
        tags={tags}
        activeProjectId={null}
        activeNotePaths={{}}
        onActiveNotePathChange={vi.fn()}
        onProjectChange={vi.fn()}
        onTagsChange={vi.fn()}
      />
    )

    expect(screen.getByText('Select a project to open its workspace')).toBeInTheDocument()
  })

  it('renders the project selector as a page-level control instead of inside AI Summary controls', () => {
    renderWithPrompt(
      <SummaryPanel
        projects={projects}
        dumps={dumps}
        tags={tags}
        activeProjectId="project-1"
        activeNotePaths={{ 'project-1': 'index.md' }}
        onActiveNotePathChange={vi.fn()}
        onProjectChange={vi.fn()}
        onTagsChange={vi.fn()}
      />
    )

    const projectSelect = screen.getByLabelText('Project')
    const summaryActionButton = screen.getByText('Generate Summary')

    expect(projectSelect.closest('section')).toBeNull()
    expect(summaryActionButton.closest('section')).not.toBeNull()
  })

  it('updates the selected project from the page-level toolbar', async () => {
    const onActiveNotePathChange = vi.fn()
    vi.spyOn(mockElectronAPI.ui, 'setLastSelectedProjectId').mockResolvedValue(undefined)

    renderWithPrompt(
      <SummaryPanel
        projects={projects}
        dumps={dumps}
        tags={tags}
        activeProjectId="project-1"
        activeNotePaths={{ 'project-1': 'index.md' }}
        onActiveNotePathChange={onActiveNotePathChange}
        onProjectChange={vi.fn()}
        onTagsChange={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'project-2' } })

    await waitFor(() => {
      expect(onActiveNotePathChange).toHaveBeenCalledWith('project-2', '')
      expect(mockElectronAPI.ui.setLastSelectedProjectId).toHaveBeenCalledWith('project-2')
    })
  })

  it('shows the app-styled confirmation before deleting a workspace note', async () => {
    renderWithPrompt(
      <SummaryPanel
        projects={projects}
        dumps={dumps}
        tags={tags}
        activeProjectId="project-1"
        activeNotePaths={{ 'project-1': 'index.md' }}
        onActiveNotePathChange={vi.fn()}
        onProjectChange={vi.fn()}
        onTagsChange={vi.fn()}
      />
    )

    fireEvent.click(screen.getByTitle('Delete note'))

    expect(await screen.findByText('Delete index.md?')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
  })
})
