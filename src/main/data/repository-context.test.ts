// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getVaultState: vi.fn(),
  readMetadata: vi.fn(),
  writeMetadata: vi.fn()
}))

vi.mock('../vault-service', () => ({
  getVaultState: mocks.getVaultState
}))

vi.mock('../metadata-service', () => ({
  readMetadata: mocks.readMetadata,
  writeMetadata: mocks.writeMetadata
}))

describe('repository-context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getVaultState.mockReturnValue({
      isOpen: true,
      vaultPath: '/tmp/test-vault',
      vaultName: 'Test Vault'
    })
  })

  it('reads metadata from the active vault path', async () => {
    const metadata = {
      version: 2 as const,
      createdAt: 1,
      projects: [],
      tags: [],
      dumps: [],
      summaries: []
    }
    mocks.readMetadata.mockResolvedValueOnce(metadata)

    const { readActiveMetadata } = await import('./repository-context')

    await expect(readActiveMetadata()).resolves.toEqual(metadata)
    expect(mocks.readMetadata).toHaveBeenCalledWith('/tmp/test-vault')
  })
})
