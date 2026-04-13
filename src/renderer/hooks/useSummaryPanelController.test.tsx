import { beforeEach, describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderHookWithPrompt } from '../test-utils'
import type { DumpEntry, Project } from '../lib/types'
import { mockElectronAPI } from '../lib/types'

vi.mock('./useSummary', () => ({
  useSummary: vi.fn(() => ({
    currentSummary: null,
    summaries: [],
    isLoading: false,
    error: null,
    generateSummary: vi.fn().mockResolvedValue(undefined),
    clearError: vi.fn(),
    setCurrentSummary: vi.fn()
  }))
}))

vi.mock('./useWorkspaceTree', () => ({
  useWorkspaceTree: vi.fn((projectId: string | null) => ({
    tree: projectId ? [{ type: 'note' as const, name: 'index.md', path: 'index.md' }] : [],
    isLoading: false,
    error: null,
    refresh: vi.fn().mockResolvedValue(undefined),
    createFolder: vi.fn().mockResolvedValue(null),
    createNote: vi.fn().mockResolvedValue(null),
    renameEntry: vi.fn().mockResolvedValue(null),
    deleteEntry: vi.fn().mockResolvedValue(undefined),
    notePaths: projectId ? ['index.md'] : []
  }))
}))

vi.mock('./useWorkspaceNote', () => ({
  useWorkspaceNote: vi.fn((projectId: string | null, notePath: string | null) => ({
    note: projectId && notePath ? { projectId, path: notePath, content: '', updatedAt: Date.now() } : null,
    content: '',
    setContent: vi.fn(),
    isLoading: false,
    isSaving: false,
    error: null,
    refresh: vi.fn().mockResolvedValue(undefined),
    saveNow: vi.fn().mockResolvedValue(null)
  }))
}))

import { useSummaryPanelController } from './useSummaryPanelController'

describe('useSummaryPanelController', () => {
  const projects: Project[] = [
    { id: 'project-1', name: 'Alpha', createdAt: 1 }
  ]

  const dumps: DumpEntry[] = []

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps all-projects mode when parent project context is null even if a last project is persisted', async () => {
    vi.spyOn(mockElectronAPI.ui, 'getLastSelectedProjectId').mockResolvedValue('project-1')

    const { result } = renderHookWithPrompt(() => useSummaryPanelController({
      projects,
      dumps,
      activeProjectId: null,
      activeNotePaths: {},
      onActiveNotePathChange: vi.fn()
    }))

    await waitFor(() => {
      expect(result.current.selectedProjectId).toBeNull()
    })
  })

  it('clears the selected workspace when the parent switches back to all-projects mode', async () => {
    vi.spyOn(mockElectronAPI.ui, 'getLastSelectedProjectId').mockResolvedValue('project-1')

    const { result, rerender } = renderHookWithPrompt(
      ({ activeProjectId }) => useSummaryPanelController({
        projects,
        dumps,
        activeProjectId,
        activeNotePaths: { 'project-1': 'index.md' },
        onActiveNotePathChange: vi.fn()
      }),
      {
        initialProps: { activeProjectId: 'project-1' as string | null }
      }
    )

    await waitFor(() => {
      expect(result.current.selectedProjectId).toBe('project-1')
      expect(result.current.effectiveNotePath).toBe('index.md')
    })

    rerender({ activeProjectId: null })

    await waitFor(() => {
      expect(result.current.selectedProjectId).toBeNull()
      expect(result.current.effectiveNotePath).toBeNull()
      expect(result.current.tree).toEqual([])
    })
  })
})
