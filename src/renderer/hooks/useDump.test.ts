import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockElectronAPI, type DumpEntry } from '../lib/types'
import { useDump } from './useDump'

describe('useDump', () => {
  const mockGetDumps = vi.fn()
  const mockCreateDump = vi.fn()

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})

    window.electronAPI = {
      ...mockElectronAPI,
      data: {
        ...mockElectronAPI.data,
        getDumps: mockGetDumps,
        createDump: mockCreateDump
      }
    }
  })

  it('refreshes dumps from persisted state after submit succeeds', async () => {
    const initialDump: DumpEntry = {
      id: 'dump-1',
      text: 'Existing dump',
      files: [],
      createdAt: 1,
      updatedAt: 1,
      projectId: 'project-1',
      tags: []
    }

    const persistedDump: DumpEntry = {
      id: 'dump-2',
      text: 'Saved dump',
      files: [],
      createdAt: 2,
      updatedAt: 2,
      projectId: 'project-1',
      tags: []
    }

    mockGetDumps
      .mockResolvedValueOnce([initialDump])
      .mockResolvedValueOnce([persistedDump, initialDump])
    mockCreateDump.mockResolvedValue(persistedDump)

    const { result } = renderHook(() => useDump())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.submitDump('Saved dump', [], 'project-1', [])
    })

    expect(mockCreateDump).toHaveBeenCalledWith({
      text: 'Saved dump',
      filePaths: [],
      projectId: 'project-1',
      tagIds: []
    })
    expect(mockGetDumps).toHaveBeenCalledTimes(2)
    expect(result.current.dumps.map(dump => dump.id)).toEqual(['dump-2', 'dump-1'])
    expect(result.current.dumps[0]?.text).toBe('Saved dump')
  })
})
