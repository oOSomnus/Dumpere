import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { mockElectronAPI } from '../lib/types'
import { useTags } from './useTags'

describe('useTags', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(mockElectronAPI.data, 'getTags').mockResolvedValue([])
    vi.spyOn(mockElectronAPI.data, 'createTag').mockImplementation(async (name) => ({
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now()
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

    expect(createdTag).toMatchObject({ name: 'deep work' })
    expect(mockElectronAPI.data.createTag).toHaveBeenCalledWith('deep work')
  })

  it('rejects unsupported tag characters even when spaces are allowed', async () => {
    const { result } = renderHook(() => useTags())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await expect(result.current.createTag('design/ui')).rejects.toThrow(
      'Tag name must contain only alphanumeric characters, spaces, and hyphens'
    )
  })
})
