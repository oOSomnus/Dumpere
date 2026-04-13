// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTagColorForIndex } from '../shared/tag-colors'

const mocks = vi.hoisted(() => ({
  getVaultState: vi.fn(),
  readMetadata: vi.fn(),
  writeMetadata: vi.fn(),
  metadata: {
    version: 2 as const,
    createdAt: 1,
    projects: [],
    tags: [
      { id: 'tag-1', name: 'alpha', createdAt: 1, color: '#FBCFE8' },
      { id: 'tag-2', name: 'beta', createdAt: 2, color: '#FED7AA' }
    ],
    dumps: [],
    summaries: []
  }
}))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp')
  }
}))

vi.mock('electron-log', () => ({
  default: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))

vi.mock('./vault-service', () => ({
  getVaultState: mocks.getVaultState
}))

vi.mock('./metadata-service', () => ({
  createEmptyMetadata: vi.fn(),
  readMetadata: mocks.readMetadata,
  writeMetadata: mocks.writeMetadata
}))

vi.mock('./file-service', () => ({
  copyFilesToVault: vi.fn(),
  deleteVaultFile: vi.fn(),
  getMimeType: vi.fn(),
  resolveVaultFilePath: vi.fn()
}))

vi.mock('./workspace-service', () => ({
  deleteProjectWorkspace: vi.fn(),
  ensureProjectWorkspace: vi.fn(),
  getDefaultWorkspaceNotePath: vi.fn(),
  readWorkspaceNote: vi.fn(),
  updateWorkspaceNote: vi.fn()
}))

vi.mock('./ai-service', () => ({
  buildSummaryPrompt: vi.fn(),
  checkSummaryHealth: vi.fn(),
  generateSummary: vi.fn()
}))

describe('vault-data-repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getVaultState.mockReturnValue({ isOpen: true, vaultPath: '/tmp/test-vault', vaultName: 'Test Vault' })
    mocks.readMetadata.mockImplementation(async () => mocks.metadata)
    mocks.writeMetadata.mockImplementation(async (_vaultPath, metadata) => {
      mocks.metadata = metadata
    })
  })

  it('creates tags with an automatically assigned color', async () => {
    const { createTag } = await import('./vault-data-repository')
    const createdTag = await createTag('gamma')

    expect(createdTag).toMatchObject({
      name: 'gamma',
      color: getTagColorForIndex(2)
    })
    expect(mocks.writeMetadata).toHaveBeenCalled()
  })
})
