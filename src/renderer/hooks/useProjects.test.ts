import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockElectronAPI, type Project } from '../lib/types'
import { useProjects } from './useProjects'

describe('useProjects', () => {
  const mockGetProjects = vi.fn()
  const mockSaveProject = vi.fn()
  const mockUpdateProject = vi.fn()
  const mockDeleteProject = vi.fn()

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})

    window.electronAPI = {
      ...mockElectronAPI,
      data: {
        ...mockElectronAPI.data,
        getProjects: mockGetProjects,
        createProject: mockSaveProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject
      }
    }
  })

  it('loads projects sorted by createdAt descending', async () => {
    mockGetProjects.mockResolvedValue([
      { id: 'project-1', name: 'Alpha', createdAt: 10 },
      { id: 'project-2', name: 'Beta', createdAt: 30 },
      { id: 'project-3', name: 'Gamma', createdAt: 20 }
    ] satisfies Project[])

    const { result } = renderHook(() => useProjects())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.projects.map(project => project.id)).toEqual([
      'project-2',
      'project-3',
      'project-1'
    ])
  })

  it('rejects control characters during creation', async () => {
    mockGetProjects.mockResolvedValue([])
    const { result } = renderHook(() => useProjects())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await expect(result.current.createProject('bad\u0000name')).rejects.toThrow(
      'Project name cannot contain control characters'
    )
    expect(mockSaveProject).not.toHaveBeenCalled()
  })

  it('rejects invalid project names during update', async () => {
    mockGetProjects.mockResolvedValue([
      { id: 'project-1', name: 'Alpha', createdAt: 10 }
    ] satisfies Project[])

    const { result } = renderHook(() => useProjects())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await expect(result.current.updateProject('project-1', '')).rejects.toThrow(
      'Project name is required'
    )
    expect(mockUpdateProject).not.toHaveBeenCalled()
  })

  it('rolls back an optimistic delete when the API call fails', async () => {
    const initialProjects: Project[] = [
      { id: 'project-1', name: 'Alpha', createdAt: 10 },
      { id: 'project-2', name: 'Beta', createdAt: 20 }
    ]

    mockGetProjects.mockResolvedValue(initialProjects)
    mockDeleteProject.mockRejectedValue(new Error('Delete failed'))

    const { result } = renderHook(() => useProjects())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.setActiveProject('project-1')
    })

    await act(async () => {
      await expect(result.current.deleteProject('project-1')).rejects.toThrow('Delete failed')
    })

    expect(result.current.projects.map(project => project.id)).toEqual([
      'project-2',
      'project-1'
    ])
    expect(result.current.activeProjectId).toBe('project-1')
    await waitFor(() => {
      expect(result.current.error).toBe('Could not delete project')
    })
  })
})
