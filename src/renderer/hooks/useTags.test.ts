import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { mockElectronAPI } from '../lib/types'
import { useTags } from './useTags'
import { getTagColorForIndex } from '@/shared/tag-colors'

describe('useTags', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(mockElectronAPI.data, 'getTags').mockResolvedValue([])
    vi.spyOn(mockElectronAPI.data, 'createTag').mockImplementation(async (name) => ({
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      color: getTagColorForIndex(0)
    }))
  })

  it('creates tags with spaces and normalizes repeated whitespace', async () => {
    const { result } = renderHook(() => useTags())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let createdTag: { name: string } | undefined
    await act(async () => {
      createdTag = await result.current.createTag('  Deep   Work  ')
    })

    expect(createdTag).toMatchObject({ name: 'Deep Work' })
    expect(createdTag).toMatchObject({ color: getTagColorForIndex(0) })
    expect(mockElectronAPI.data.createTag).toHaveBeenCalledWith('Deep Work')
  })

  it('allows Unicode and path-like tag characters', async () => {
    const { result } = renderHook(() => useTags())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await expect(result.current.createTag('design/ui')).resolves.toMatchObject({ name: 'design/ui' })
  })
})
