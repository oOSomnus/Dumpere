import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DumpEntry, Project, WorkspaceNode } from '../lib/types'
import { mockElectronAPI } from '../lib/types'

vi.mock('./usePrompt', () => ({
  usePrompt: () => ({
    confirm: vi.fn(),
    notify: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  })
}))

const projects: Project[] = [
  { id: 'project-1', name: 'Alpha', createdAt: 1 },
  { id: 'project-2', name: 'Beta', createdAt: 2 }
]

const projectOneTree: WorkspaceNode[] = [
  {
    type: 'folder',
    name: 'docs',
    path: 'docs',
    children: [
      { type: 'note', name: 'plan.md', path: 'docs/plan.md' }
    ]
  },
  { type: 'note', name: 'retro.md', path: 'retro.md' }
]

const projectTwoTree: WorkspaceNode[] = [
  { type: 'note', name: 'summary.md', path: 'summary.md' }
]

async function renderUseDumpReferenceInsertion(activeProjectId: string | null = 'project-2') {
  const { useDumpReferenceInsertion } = await import('./useDumpReferenceInsertion')
  return renderHook(() => useDumpReferenceInsertion({ projects, activeProjectId }))
}

describe('useDumpReferenceInsertion', () => {
  beforeEach(() => {
    vi.resetModules()
    window.electronAPI = {
      ...mockElectronAPI,
      ui: {
        ...mockElectronAPI.ui,
        getSummaryPanelState: vi.fn(async () => ({
          'project-1': { workspaceMode: 'split', notePath: 'docs/plan.md' }
        })),
        setSummaryPanelState: vi.fn(async () => {})
      },
      workspace: {
        ...mockElectronAPI.workspace,
        getTree: vi.fn(async (projectId: string) => (
          projectId === 'project-1' ? projectOneTree : projectTwoTree
        )),
        readNote: vi.fn(async (projectId: string, notePath: string) => ({
          projectId,
          path: notePath,
          content: '## Notes',
          updatedAt: 1
        })),
        updateNote: vi.fn(async (projectId: string, notePath: string, content: string) => ({
          projectId,
          path: notePath,
          content,
          updatedAt: 2
        }))
      }
    }
  })

  it('prefers the selected dump project and previously active note path', async () => {
    const selection: DumpEntry[] = [{
      id: 'dump-1',
      text: 'Reference text',
      files: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      projectId: 'project-1',
      tags: []
    }]

    const { result } = await renderUseDumpReferenceInsertion()

    act(() => {
      result.current.handleActiveNotePathChange('project-1', 'docs/plan.md')
    })

    await act(async () => {
      await result.current.openDialogForSelection(selection)
    })

    expect(result.current.isDialogOpen).toBe(true)
    expect(result.current.selectedProjectId).toBe('project-1')
    expect(result.current.selectedNotePath).toBe('docs/plan.md')
    expect(result.current.noteOptions.map(option => option.path)).toEqual(['docs/plan.md', 'retro.md'])
  })

  it('loads persisted active workspace notes on mount', async () => {
    const { result } = await renderUseDumpReferenceInsertion()

    await waitFor(() => {
      expect(result.current.activeWorkspaceNotes).toEqual({ 'project-1': 'docs/plan.md' })
    })
  })

  it('refreshes note options when the target project changes', async () => {
    const selection: DumpEntry[] = [{
      id: 'dump-1',
      text: 'Reference text',
      files: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      projectId: null,
      tags: []
    }]

    const { result } = await renderUseDumpReferenceInsertion('project-2')

    await act(async () => {
      await result.current.openDialogForSelection(selection)
    })

    expect(result.current.selectedProjectId).toBe('project-2')
    expect(result.current.selectedNotePath).toBe('summary.md')

    await act(async () => {
      result.current.handleProjectChange('project-1')
    })

    expect(result.current.selectedProjectId).toBe('project-1')
    expect(result.current.selectedNotePath).toBe('docs/plan.md')
  })

  it('resets dialog state after closing', async () => {
    const selection: DumpEntry[] = [{
      id: 'dump-1',
      text: 'Reference text',
      files: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      projectId: 'project-1',
      tags: []
    }]

    const { result } = await renderUseDumpReferenceInsertion()

    await act(async () => {
      await result.current.openDialogForSelection(selection)
    })

    act(() => {
      result.current.handleOpenChange(false)
    })

    expect(result.current.isDialogOpen).toBe(false)
    expect(result.current.selectedProjectId).toBeNull()
    expect(result.current.selectedNotePath).toBeNull()
    expect(result.current.noteOptions).toEqual([])
  })

  it('persists active note path changes', async () => {
    const { result } = await renderUseDumpReferenceInsertion()

    await act(async () => {
      result.current.handleActiveNotePathChange('project-2', 'summary.md')
    })

    await waitFor(() => {
      expect(window.electronAPI.ui.setSummaryPanelState).toHaveBeenCalledWith({
        'project-1': { workspaceMode: 'split', notePath: 'docs/plan.md' },
        'project-2': { workspaceMode: 'edit', notePath: 'summary.md' }
      })
    })
  })
})
