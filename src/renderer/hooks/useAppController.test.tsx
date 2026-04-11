import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockElectronAPI, type DumpEntry, type Project, type Tag } from '../lib/types'

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
  { id: 'project-1', name: 'Alpha', createdAt: 1 }
]

const tags: Tag[] = [
  { id: 'tag-1', name: 'urgent', createdAt: 1 }
]

const dumps: DumpEntry[] = [
  {
    id: 'dump-1',
    text: 'Investigate search regression',
    files: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    projectId: 'project-1',
    tags: ['tag-1']
  }
]

async function renderUseAppController() {
  const { useAppController } = await import('./useAppController')
  return renderHook(() => useAppController())
}

describe('useAppController', () => {
  beforeEach(() => {
    vi.resetModules()
    window.electronAPI = {
      ...mockElectronAPI,
      getDumps: vi.fn(async () => dumps),
      getProjects: vi.fn(async () => projects),
      getTags: vi.fn(async () => tags),
      saveProject: vi.fn(async (project) => project),
      updateProject: vi.fn(async (id: string, name: string) => ({ id, name, createdAt: 1 })),
      deleteProject: vi.fn(async () => {}),
      saveTag: vi.fn(async (tag) => tag),
      deleteTag: vi.fn(async () => {}),
      copyFiles: vi.fn(async () => []),
      saveDump: vi.fn(async (dump) => ({ ...dump, id: 'saved-dump' })),
      deleteDump: vi.fn(async () => {}),
      updateDump: vi.fn(async (id, updates) => ({
        id,
        text: '',
        files: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        projectId: updates.projectId ?? null,
        tags: updates.tags ?? []
      }))
    }
  })

  it('returns to the grid view when the search query changes', async () => {
    const { result } = await renderUseAppController()

    await waitFor(() => {
      expect(result.current.projects).toHaveLength(1)
    })

    act(() => {
      result.current.handleViewChange('settings')
    })

    act(() => {
      result.current.handleSearchChange('regression')
    })

    expect(result.current.currentView).toBe('grid')
    expect(result.current.searchQuery).toBe('regression')
  })

  it('syncs the active project and project filter from sidebar selection', async () => {
    const { result } = await renderUseAppController()

    await waitFor(() => {
      expect(result.current.projects).toHaveLength(1)
    })

    act(() => {
      result.current.handleViewChange('summaries')
    })

    act(() => {
      result.current.handleSidebarProjectSelect('project-1')
    })

    expect(result.current.currentView).toBe('grid')
    expect(result.current.activeProjectId).toBe('project-1')
    expect(result.current.filters.projectId).toBe('project-1')
  })
})
