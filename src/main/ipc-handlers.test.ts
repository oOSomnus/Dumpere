// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { join } from 'node:path'

const mocks = vi.hoisted(() => ({
  ipcHandle: vi.fn(),
  showSaveDialog: vi.fn(),
  showOpenDialog: vi.fn(),
  clipboardWriteText: vi.fn(),
  shellOpenPath: vi.fn(),
  browserSend: vi.fn(),
  storeGet: vi.fn(),
  storeSet: vi.fn(),
  checkSummaryHealth: vi.fn(),
  getDefaultSummarySettings: vi.fn(),
  sanitizeSummarySettings: vi.fn(),
  getDumps: vi.fn(),
  createDump: vi.fn(),
  updateDump: vi.fn(),
  deleteDump: vi.fn(),
  getProjects: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  getTags: vi.fn(),
  createTag: vi.fn(),
  deleteTag: vi.fn(),
  getSummaries: vi.fn(),
  generateSummary: vi.fn(),
  exportSummary: vi.fn(),
  exportDumps: vi.fn(),
  importDumps: vi.fn(),
  initializeVaultData: vi.fn(),
  createVault: vi.fn(),
  openVault: vi.fn(),
  closeVault: vi.fn(),
  getVaultState: vi.fn(),
  onVaultStateChange: vi.fn(),
  getWorkspaceTree: vi.fn(),
  createWorkspaceFolder: vi.fn(),
  createWorkspaceNote: vi.fn(),
  readWorkspaceNote: vi.fn(),
  updateWorkspaceNote: vi.fn(),
  renameWorkspaceEntry: vi.fn(),
  deleteWorkspaceEntry: vi.fn()
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: mocks.ipcHandle
  },
  dialog: {
    showSaveDialog: mocks.showSaveDialog,
    showOpenDialog: mocks.showOpenDialog
  },
  clipboard: {
    writeText: mocks.clipboardWriteText
  },
  shell: {
    openPath: mocks.shellOpenPath
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => [{ webContents: { send: mocks.browserSend } }])
  },
  nativeTheme: {
    shouldUseDarkColors: false
  },
  app: {
    getPath: vi.fn(() => '/tmp')
  }
}))

vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('./store', () => ({
  store: {
    get: mocks.storeGet,
    set: mocks.storeSet
  }
}))

vi.mock('./ai-service', () => ({
  checkSummaryHealth: mocks.checkSummaryHealth,
  getDefaultSummarySettings: mocks.getDefaultSummarySettings,
  sanitizeSummarySettings: mocks.sanitizeSummarySettings
}))

vi.mock('./vault-data-repository', () => ({
  getDumps: mocks.getDumps,
  createDump: mocks.createDump,
  updateDump: mocks.updateDump,
  deleteDump: mocks.deleteDump,
  getProjects: mocks.getProjects,
  createProject: mocks.createProject,
  updateProject: mocks.updateProject,
  deleteProject: mocks.deleteProject,
  getTags: mocks.getTags,
  createTag: mocks.createTag,
  deleteTag: mocks.deleteTag,
  getSummaries: mocks.getSummaries,
  generateSummary: mocks.generateSummary,
  exportSummary: mocks.exportSummary,
  exportDumps: mocks.exportDumps,
  importDumps: mocks.importDumps,
  initializeVaultData: mocks.initializeVaultData
}))

vi.mock('./vault-service', () => ({
  createVault: mocks.createVault,
  openVault: mocks.openVault,
  closeVault: mocks.closeVault,
  getVaultState: mocks.getVaultState,
  onVaultStateChange: mocks.onVaultStateChange
}))

vi.mock('./workspace-service', () => ({
  getWorkspaceTree: mocks.getWorkspaceTree,
  createWorkspaceFolder: mocks.createWorkspaceFolder,
  createWorkspaceNote: mocks.createWorkspaceNote,
  readWorkspaceNote: mocks.readWorkspaceNote,
  updateWorkspaceNote: mocks.updateWorkspaceNote,
  renameWorkspaceEntry: mocks.renameWorkspaceEntry,
  deleteWorkspaceEntry: mocks.deleteWorkspaceEntry
}))

describe('ipc-handlers', () => {
  let handlers: Record<string, (...args: unknown[]) => unknown>

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    const defaultSettings = {
      provider: 'openai' as const,
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test',
      model: 'gpt-4.1-mini'
    }

    mocks.storeGet.mockImplementation((key: string, fallback: unknown) => {
      if (key === 'summarySettings') return defaultSettings
      if (key === 'recentVaults') return [{ path: '/vault', name: 'Vault', lastOpened: 1 }]
      if (key === 'theme') return 'system'
      if (key === 'summaryPanelState') return {}
      if (key === 'lastSelectedProjectId') return null
      if (key === 'panelSizes') return { sidebarWidth: 240, inputHeight: 60 }
      return fallback
    })
    mocks.getDefaultSummarySettings.mockReturnValue(defaultSettings)
    mocks.sanitizeSummarySettings.mockImplementation((settings) => settings)
    mocks.checkSummaryHealth.mockResolvedValue(true)
    mocks.getSummaries.mockResolvedValue([])
    mocks.getProjects.mockResolvedValue([])
    mocks.generateSummary.mockResolvedValue({
      id: 'summary-1',
      type: 'daily',
      projectId: null,
      generatedAt: 1,
      content: '# Summary',
      dumpCount: 1
    })
    mocks.exportSummary.mockResolvedValue('/tmp/summary.md')
    mocks.exportDumps.mockResolvedValue('/tmp/export.zip')
    mocks.importDumps.mockResolvedValue(2)
    mocks.createVault.mockResolvedValue({ isOpen: true, vaultPath: '/vault', vaultName: 'Vault' })
    mocks.openVault.mockResolvedValue({ isOpen: true, vaultPath: '/vault', vaultName: 'Vault' })
    mocks.closeVault.mockResolvedValue({ isOpen: false, vaultPath: null, vaultName: null })
    mocks.getVaultState.mockReturnValue({ isOpen: true, vaultPath: '/vault', vaultName: 'Vault' })
    mocks.readWorkspaceNote.mockResolvedValue({
      projectId: 'project-1',
      path: 'index.md',
      content: '# Notes',
      updatedAt: 1
    })
    mocks.updateWorkspaceNote.mockResolvedValue({
      projectId: 'project-1',
      path: 'index.md',
      content: '# Updated',
      updatedAt: 2
    })

    const { setupIPCHandlers } = await import('./ipc-handlers')
    setupIPCHandlers()

    handlers = {}
    for (const [channel, handler] of mocks.ipcHandle.mock.calls as Array<[string, (...args: unknown[]) => unknown]>) {
      handlers[channel] = handler
    }
  })

  it('opens vault attachments with the system shell', async () => {
    mocks.shellOpenPath.mockResolvedValueOnce('')

    await expect(handlers['files:open'](null, 'files/report.pdf')).resolves.toBeUndefined()
    expect(mocks.shellOpenPath).toHaveBeenCalledWith(join('/vault', '.dumpere', 'files', 'report.pdf'))
  })

  it('throws when the system cannot open a vault attachment', async () => {
    mocks.shellOpenPath.mockResolvedValueOnce('No application is associated with this file')

    await expect(handlers['files:open'](null, 'files/report.pdf')).rejects.toThrow('No application is associated with this file')
  })

  it('returns summary health through the ui namespace', async () => {
    mocks.checkSummaryHealth.mockResolvedValueOnce(true)

    await expect(handlers['ui:summary:check-health']()).resolves.toBe(true)
    expect(mocks.sanitizeSummarySettings).toHaveBeenCalledWith({
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test',
      model: 'gpt-4.1-mini'
    })
    expect(mocks.checkSummaryHealth).toHaveBeenCalled()
  })

  it('gets and updates summary settings through ui handlers', async () => {
    const settings = {
      provider: 'claude' as const,
      baseUrl: 'https://api.anthropic.com/v1',
      apiKey: 'anthropic-key',
      model: 'claude-3-5-sonnet-latest'
    }
    mocks.sanitizeSummarySettings.mockReturnValueOnce(settings)

    expect(handlers['ui:summary-settings:get']()).toEqual(settings)

    mocks.sanitizeSummarySettings.mockReturnValueOnce(settings)
    expect(handlers['ui:summary-settings:update'](null, settings)).toEqual(settings)
    expect(mocks.storeSet).toHaveBeenCalledWith('summarySettings', settings)
  })

  it('generates summaries through the data namespace using stored settings', async () => {
    const summary = {
      id: 'summary-1',
      type: 'daily' as const,
      projectId: 'project-1',
      generatedAt: 2,
      content: '# Generated',
      dumpCount: 3
    }
    mocks.generateSummary.mockResolvedValueOnce(summary)

    await expect(handlers['data:generate-summary'](null, { type: 'daily', projectId: 'project-1' })).resolves.toEqual(summary)
    expect(mocks.generateSummary).toHaveBeenCalledWith(
      { type: 'daily', projectId: 'project-1' },
      {
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4.1-mini'
      }
    )
  })

  it('exports an existing summary after prompting for a file path', async () => {
    mocks.getSummaries.mockResolvedValueOnce([{
      id: 'summary-1',
      type: 'daily',
      projectId: 'project-1',
      generatedAt: new Date('2026-04-10T12:00:00Z').getTime(),
      content: '# Summary',
      dumpCount: 1
    }])
    mocks.getProjects.mockResolvedValueOnce([{ id: 'project-1', name: 'Alpha Team', createdAt: 1 }])
    mocks.exportSummary.mockImplementationOnce(async (_summaryId: string, outputPath: string) => outputPath)
    mocks.showSaveDialog.mockResolvedValueOnce({
      canceled: false,
      filePath: '/tmp/alpha-summary.md'
    })

    await expect(handlers['data:export-summary'](null, 'summary-1')).resolves.toBe('/tmp/alpha-summary.md')
    expect(mocks.showSaveDialog).toHaveBeenCalledWith(expect.objectContaining({
      defaultPath: 'summary-alpha-team-daily-2026-04-10.md'
    }))
    expect(mocks.exportSummary).toHaveBeenCalledWith('summary-1', '/tmp/alpha-summary.md')
  })

  it('returns null when summary export is canceled', async () => {
    mocks.getSummaries.mockResolvedValueOnce([{
      id: 'summary-1',
      type: 'daily',
      projectId: null,
      generatedAt: 1,
      content: '# Summary',
      dumpCount: 1
    }])
    mocks.showSaveDialog.mockResolvedValueOnce({ canceled: true })

    await expect(handlers['data:export-summary'](null, 'summary-1')).resolves.toBeNull()
    expect(mocks.exportSummary).not.toHaveBeenCalled()
  })

  it('prompts for an export path when exporting dumps without one', async () => {
    mocks.showSaveDialog.mockResolvedValueOnce({
      canceled: false,
      filePath: '/tmp/project.zip'
    })

    await expect(handlers['data:export-dumps'](null, ['dump-1'], 'alpha-project')).resolves.toBe('/tmp/export.zip')
    expect(mocks.exportDumps).toHaveBeenCalledWith(['dump-1'], 'alpha-project', '/tmp/project.zip')
  })

  it('initializes vault data after creating a vault', async () => {
    await expect(handlers['vault:create']()).resolves.toEqual({
      isOpen: true,
      vaultPath: '/vault',
      vaultName: 'Vault'
    })
    expect(mocks.createVault).toHaveBeenCalled()
    expect(mocks.initializeVaultData).toHaveBeenCalled()
  })

  it('forwards workspace note updates through the workspace namespace', async () => {
    await expect(handlers['workspace:update-note'](null, 'project-1', 'index.md', '# Updated')).resolves.toEqual({
      projectId: 'project-1',
      path: 'index.md',
      content: '# Updated',
      updatedAt: 2
    })
    expect(mocks.updateWorkspaceNote).toHaveBeenCalledWith('project-1', 'index.md', '# Updated')
  })

  it('copies text to the clipboard through the ui namespace', async () => {
    await expect(handlers['ui:copy-to-clipboard'](null, 'copied text')).resolves.toBeUndefined()
    expect(mocks.clipboardWriteText).toHaveBeenCalledWith('copied text')
  })
})
