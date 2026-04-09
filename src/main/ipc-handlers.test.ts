import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SummaryEntry } from '../renderer/lib/types'

const mocks = vi.hoisted(() => ({
  mockStore: {
    get: vi.fn((key: string, defaultValue: unknown) => defaultValue),
    set: vi.fn()
  },
  mockCheckSummaryHealth: vi.fn(),
  mockGenerateSummary: vi.fn(),
  mockBuildSummaryPrompt: vi.fn(),
  mockGetDefaultSummarySettings: vi.fn(() => ({
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    apiKey: '',
    model: 'mistral'
  })),
  mockSanitizeSummarySettings: vi.fn((settings) => settings)
}))

// Mock electron modules
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn()
  },
  dialog: {
    showSaveDialog: vi.fn()
  },
  app: {
    getPath: vi.fn(() => '/tmp')
  },
  clipboard: {
    writeText: vi.fn()
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

// Mock fs/promises
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>()

  return {
    ...actual,
    default: actual,
    writeFile: vi.fn()
  }
})

vi.mock('./store', () => ({
  store: mocks.mockStore
}))

// Mock file-service
vi.mock('./file-service', () => ({
  copyFiles: vi.fn(),
  deleteFile: vi.fn(),
  getFileUrl: vi.fn((path: string) => `file://${path}`),
  getDumpsDir: vi.fn(() => '/dumps')
}))

vi.mock('./vault-service', () => ({
  createVault: vi.fn(),
  openVault: vi.fn(),
  getVaultState: vi.fn(() => ({ isOpen: false, vaultPath: null, vaultName: null })),
  onVaultStateChange: vi.fn(),
}))

vi.mock('./metadata-service', () => ({
  createDump: vi.fn(),
  readMetadata: vi.fn(),
}))

// Mock ai-service
vi.mock('./ai-service', () => ({
  checkSummaryHealth: mocks.mockCheckSummaryHealth,
  generateSummary: mocks.mockGenerateSummary,
  buildSummaryPrompt: mocks.mockBuildSummaryPrompt,
  getDefaultSummarySettings: mocks.mockGetDefaultSummarySettings,
  sanitizeSummarySettings: mocks.mockSanitizeSummarySettings
}))

// Mock archiver
vi.mock('archiver', () => ({
  default: vi.fn(() => ({
    pipe: vi.fn(),
    append: vi.fn(),
    finalize: vi.fn(),
    on: vi.fn(),
    pointer: vi.fn(() => 100)
  }))
}))

// Mock createWriteStream
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()

  return {
    ...actual,
    default: actual,
    createWriteStream: vi.fn(() => ({
      on: vi.fn((event, cb) => {
        if (event === 'close') setTimeout(cb, 0)
        return this
      })
    }))
  }
})

// Mock adm-zip
vi.mock('adm-zip', () => ({
  default: vi.fn(() => ({
    getEntries: vi.fn(() => []),
    extractEntryTo: vi.fn()
  }))
}))

// Import after mocking
import { ipcMain, dialog } from 'electron'
import { writeFile as mockedWriteFile } from 'fs/promises'
import { setupIPCHandlers } from './ipc-handlers'

describe('IPC Handlers - AI operations', () => {
  const createMockSummary = (overrides: Partial<SummaryEntry> = {}): SummaryEntry => ({
    id: crypto.randomUUID(),
    type: 'daily',
    projectId: null,
    generatedAt: Date.now(),
    content: 'Test summary content',
    dumpCount: 5,
    ...overrides
  })

  let ipcHandlers: Record<string, ReturnType<typeof vi.fn>> = {}

  beforeEach(() => {
    vi.clearAllMocks()
    setupIPCHandlers()

    // Extract all ipcMain.handle calls to track handlers
    ipcHandlers = {}
    ;(ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.forEach(([channel, handler]: [string, Function]) => {
      ipcHandlers[channel] = handler
    })

    // Default store behavior
    mocks.mockStore.get.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === 'summaries') return []
      if (key === 'dumps') return []
      if (key === 'projects') return []
      if (key === 'summarySettings') return mocks.mockGetDefaultSummarySettings()
      return defaultValue
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('dump handlers', () => {
    it('assigns a new id when saving a dump', async () => {
      const handler = ipcHandlers['store:save-dump']
      const result = await handler(null, {
        text: 'Saved dump',
        files: [],
        createdAt: 1,
        updatedAt: 1,
        projectId: 'project-1',
        tags: []
      })

      expect(result.id).toBeTruthy()
      expect(mocks.mockStore.set).toHaveBeenCalledWith('dumps', [
        expect.objectContaining({
          id: result.id,
          text: 'Saved dump'
        })
      ])
    })

    it('rejects saving a dump without a project assignment', async () => {
      const handler = ipcHandlers['store:save-dump']

      expect(() => handler(null, {
        text: 'Saved dump',
        files: [],
        createdAt: 1,
        updatedAt: 1,
        projectId: null,
        tags: []
      })).toThrow('Project assignment is required before saving a dump')
    })

    it('normalizes missing dump ids when loading dumps', async () => {
      mocks.mockStore.get.mockReturnValue([
        {
          text: 'legacy dump',
          files: [],
          createdAt: 1,
          updatedAt: 1,
          projectId: null,
          tags: []
        }
      ])

      const handler = ipcHandlers['store:get-dumps']
      const result = await handler()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBeTruthy()
      expect(mocks.mockStore.set).toHaveBeenCalledWith('dumps', [
        expect.objectContaining({
          id: result[0].id,
          text: 'legacy dump'
        })
      ])
    })
  })

  describe('summary:check-health', () => {
    it('returns true when the configured provider is healthy', async () => {
      mocks.mockCheckSummaryHealth.mockResolvedValueOnce(true)

      const handler = ipcHandlers['summary:check-health']
      const result = await handler()

      expect(result).toBe(true)
      expect(mocks.mockCheckSummaryHealth).toHaveBeenCalled()
    })

    it('returns false when the configured provider is unhealthy', async () => {
      mocks.mockCheckSummaryHealth.mockResolvedValueOnce(false)

      const handler = ipcHandlers['summary:check-health']
      const result = await handler()

      expect(result).toBe(false)
    })
  })

  describe('summary settings handlers', () => {
    it('returns stored summary settings', async () => {
      const settings = {
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4.1-mini'
      }
      mocks.mockStore.get.mockReturnValue(settings)

      const handler = ipcHandlers['summary:get-settings']
      const result = await handler()

      expect(result).toEqual(settings)
      expect(mocks.mockSanitizeSummarySettings).toHaveBeenCalledWith(settings)
    })

    it('persists updated summary settings', async () => {
      const settings = {
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4.1-mini'
      }

      const handler = ipcHandlers['summary:update-settings']
      const result = await handler(null, settings)

      expect(result).toEqual(settings)
      expect(mocks.mockStore.set).toHaveBeenCalledWith('summarySettings', settings)
    })
  })

  describe('ai:generate-summary', () => {
    it('throws when the provider is unavailable', async () => {
      mocks.mockCheckSummaryHealth.mockResolvedValueOnce(false)

      const handler = ipcHandlers['ai:generate-summary']
      await expect(handler(null, { type: 'daily', projectId: null })).rejects.toThrow('unavailable')
    })

    it('returns null when no dumps found for the period', async () => {
      mocks.mockCheckSummaryHealth.mockResolvedValueOnce(true)
      mocks.mockStore.get.mockReturnValue([]) // No dumps

      const handler = ipcHandlers['ai:generate-summary']
      const result = await handler(null, { type: 'daily', projectId: null })

      expect(result).toBeNull()
    })

    it('generates summary and stores it when dumps exist', async () => {
      const mockDump = {
        id: 'dump-1',
        text: 'Test dump',
        files: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        projectId: null,
        tags: []
      }
      mocks.mockCheckSummaryHealth.mockResolvedValueOnce(true)
      mocks.mockStore.get.mockImplementation((key: string, defaultValue: unknown) => {
        if (key === 'summarySettings') return mocks.mockGetDefaultSummarySettings()
        if (key === 'dumps') return [mockDump]
        if (key === 'summaries') return []
        return defaultValue
      })
      mocks.mockBuildSummaryPrompt.mockReturnValueOnce('Test prompt')
      mocks.mockGenerateSummary.mockResolvedValueOnce('Generated summary content')

      const handler = ipcHandlers['ai:generate-summary']
      const result = await handler(null, { type: 'daily', projectId: null })

      expect(result).toBeTruthy()
      expect(result.content).toBe('Generated summary content')
      expect(mocks.mockStore.set).toHaveBeenCalledWith('summaries', expect.any(Array))
    })

    it('filters dumps by project when projectId is provided', async () => {
      const mockDump = {
        id: 'dump-1',
        text: 'Test dump',
        files: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        projectId: 'project-1',
        tags: []
      }
      mocks.mockCheckSummaryHealth.mockResolvedValueOnce(true)
      mocks.mockStore.get.mockImplementation((key: string, defaultValue: unknown) => {
        if (key === 'summarySettings') return mocks.mockGetDefaultSummarySettings()
        if (key === 'dumps') return [mockDump]
        if (key === 'summaries') return []
        return defaultValue
      })
      mocks.mockBuildSummaryPrompt.mockReturnValueOnce('Test prompt')
      mocks.mockGenerateSummary.mockResolvedValueOnce('Generated summary content')

      const handler = ipcHandlers['ai:generate-summary']
      await handler(null, { type: 'daily', projectId: 'project-1' })

      // The dumps should be filtered by projectId
      expect(mocks.mockGenerateSummary).toHaveBeenCalled()
    })
  })

  describe('ai:get-summaries', () => {
    it('returns all summaries when no filters provided', () => {
      const summaries = [createMockSummary({ id: '1' }), createMockSummary({ id: '2' })]
      mocks.mockStore.get.mockReturnValue(summaries)

      const handler = ipcHandlers['ai:get-summaries']
      const result = handler(null)

      expect(result).toEqual(summaries)
    })

    it('filters summaries by type when provided', () => {
      const summaries = [
        createMockSummary({ id: '1', type: 'daily' }),
        createMockSummary({ id: '2', type: 'weekly' })
      ]
      mocks.mockStore.get.mockReturnValue(summaries)

      const handler = ipcHandlers['ai:get-summaries']
      const result = handler(null, { type: 'daily' })

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('daily')
    })

    it('filters summaries by projectId when provided', () => {
      const summaries = [
        createMockSummary({ id: '1', projectId: 'project-1' }),
        createMockSummary({ id: '2', projectId: 'project-2' })
      ]
      mocks.mockStore.get.mockReturnValue(summaries)

      const handler = ipcHandlers['ai:get-summaries']
      const result = handler(null, { projectId: 'project-1' })

      expect(result).toHaveLength(1)
      expect(result[0].projectId).toBe('project-1')
    })
  })

  describe('ai:export-summary', () => {
    it('returns null when summary not found', async () => {
      mocks.mockStore.get.mockReturnValue([])

      ;(dialog.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({ canceled: true })

      const handler = ipcHandlers['ai:export-summary']
      const result = await handler(null, 'nonexistent-id')

      expect(result).toBeNull()
    })

    it('saves summary content to file', async () => {
      const summary = createMockSummary({ content: '# Test Summary\n\nContent here' })
      mocks.mockStore.get.mockReturnValue([summary])

      ;(dialog.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: false,
        filePath: '/tmp/summary.md'
      })

      const handler = ipcHandlers['ai:export-summary']
      const result = await handler(null, summary.id)

      expect(result).toBe('/tmp/summary.md')
      expect(mockedWriteFile).toHaveBeenCalledWith('/tmp/summary.md', summary.content, 'utf8')
    })

    it('returns null when dialog is canceled', async () => {
      const summary = createMockSummary()
      mocks.mockStore.get.mockReturnValue([summary])

      ;(dialog.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({ canceled: true })

      const handler = ipcHandlers['ai:export-summary']
      const result = await handler(null, summary.id)

      expect(result).toBeNull()
    })
  })
})
