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
  },
  deleteProjectWorkspace: vi.fn(),
  ensureProjectWorkspace: vi.fn(),
  getDefaultWorkspaceNotePath: vi.fn(),
  readWorkspaceNote: vi.fn(),
  updateWorkspaceNote: vi.fn(),
  checkSummaryHealth: vi.fn(),
  buildSummaryPrompt: vi.fn(),
  generateSummaryText: vi.fn()
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
  deleteProjectWorkspace: mocks.deleteProjectWorkspace,
  ensureProjectWorkspace: mocks.ensureProjectWorkspace,
  getDefaultWorkspaceNotePath: mocks.getDefaultWorkspaceNotePath,
  readWorkspaceNote: mocks.readWorkspaceNote,
  updateWorkspaceNote: mocks.updateWorkspaceNote
}))

vi.mock('./ai-service', () => ({
  buildSummaryPrompt: mocks.buildSummaryPrompt,
  checkSummaryHealth: mocks.checkSummaryHealth,
  generateSummary: mocks.generateSummaryText
}))

describe('vault-data-repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getVaultState.mockReturnValue({ isOpen: true, vaultPath: '/tmp/test-vault', vaultName: 'Test Vault' })
    mocks.readMetadata.mockImplementation(async () => mocks.metadata)
    mocks.writeMetadata.mockImplementation(async (_vaultPath, metadata) => {
      mocks.metadata = metadata
    })
    mocks.getDefaultWorkspaceNotePath.mockReturnValue('index.md')
    mocks.checkSummaryHealth.mockResolvedValue(true)
    mocks.readWorkspaceNote.mockResolvedValue({
      projectId: 'project-1',
      path: 'index.md',
      content: '# Existing Notes',
      updatedAt: 1
    })
    mocks.buildSummaryPrompt.mockReturnValue('summary prompt')
    mocks.generateSummaryText.mockResolvedValue('## Summary\n- Completed work')
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

  it('deletes a project and clears related dump and summary associations', async () => {
    mocks.metadata = {
      ...mocks.metadata,
      projects: [
        { id: 'project-1', name: 'Alpha', createdAt: 1 },
        { id: 'project-2', name: 'Beta', createdAt: 2 }
      ],
      dumps: [
        {
          id: 'dump-1',
          text: 'Tracked work',
          files: [],
          createdAt: 10,
          updatedAt: 10,
          projectId: 'project-1',
          tags: []
        }
      ],
      summaries: [
        {
          id: 'summary-1',
          type: 'daily',
          projectId: 'project-1',
          generatedAt: 11,
          content: '# Summary',
          dumpCount: 1
        }
      ]
    }

    const { deleteProject } = await import('./vault-data-repository')
    await deleteProject('project-1')

    expect(mocks.metadata.projects).toEqual([
      { id: 'project-2', name: 'Beta', createdAt: 2 }
    ])
    expect(mocks.metadata.dumps[0]).toMatchObject({
      id: 'dump-1',
      projectId: null
    })
    expect(mocks.metadata.summaries).toEqual([])
    expect(mocks.deleteProjectWorkspace).toHaveBeenCalledWith('project-1')
  })

  it('writes generated project summaries back to the default workspace note', async () => {
    mocks.metadata = {
      ...mocks.metadata,
      projects: [{ id: 'project-1', name: 'Alpha', createdAt: 1 }],
      dumps: [
        {
          id: 'dump-1',
          text: 'Tracked work',
          files: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          projectId: 'project-1',
          tags: []
        }
      ]
    }

    const { generateSummary } = await import('./vault-data-repository')
    const summary = await generateSummary(
      { type: 'daily', projectId: 'project-1' },
      {
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4.1-mini'
      }
    )

    expect(summary).toMatchObject({
      type: 'daily',
      projectId: 'project-1',
      content: '## Summary\n- Completed work'
    })
    expect(mocks.buildSummaryPrompt).toHaveBeenCalled()
    expect(mocks.updateWorkspaceNote).toHaveBeenCalledWith(
      'project-1',
      'index.md',
      expect.stringContaining('## AI Daily Summary')
    )
  })
})
