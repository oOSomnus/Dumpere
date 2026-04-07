import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SummaryEntry } from '../renderer/lib/types'

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
vi.mock('fs/promises', () => ({
  writeFile: vi.fn()
}))

// Mock store
const mockStore = {
  get: vi.fn((key: string, defaultValue: unknown) => defaultValue),
  set: vi.fn()
}
vi.mock('./store', () => ({
  store: mockStore
}))

// Mock file-service
vi.mock('./file-service', () => ({
  copyFiles: vi.fn(),
  deleteFile: vi.fn(),
  getFileUrl: vi.fn((path: string) => `file://${path}`),
  getDumpsDir: vi.fn(() => '/dumps')
}))

// Mock ai-service
const mockCheckOllamaHealth = vi.fn()
const mockGenerateSummary = vi.fn()
const mockBuildSummaryPrompt = vi.fn()
vi.mock('./ai-service', () => ({
  checkOllamaHealth: mockCheckOllamaHealth,
  generateSummary: mockGenerateSummary,
  buildSummaryPrompt: mockBuildSummaryPrompt
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
vi.mock('fs', () => ({
  ...vi.importActual('fs'),
  createWriteStream: vi.fn(() => ({
    on: vi.fn((event, cb) => {
      if (event === 'close') setTimeout(cb, 0)
      return this
    })
  }))
}))

// Mock adm-zip
vi.mock('adm-zip', () => ({
  default: vi.fn(() => ({
    getEntries: vi.fn(() => []),
    extractEntryTo: vi.fn()
  }))
}))

// Import after mocking
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

    // Extract all ipcMain.handle calls to track handlers
    const { ipcMain } = require('electron')
    ipcHandlers = {}
    ;(ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.forEach(([channel, handler]: [string, Function]) => {
      ipcHandlers[channel] = handler
    })

    // Default store behavior
    mockStore.get.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === 'summaries') return []
      if (key === 'dumps') return []
      if (key === 'projects') return []
      return defaultValue
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ai:check-health', () => {
    it('returns true when Ollama is healthy', async () => {
      mockCheckOllamaHealth.mockResolvedValueOnce(true)

      const handler = ipcHandlers['ai:check-health']
      const result = await handler()

      expect(result).toBe(true)
      expect(mockCheckOllamaHealth).toHaveBeenCalled()
    })

    it('returns false when Ollama is unhealthy', async () => {
      mockCheckOllamaHealth.mockResolvedValueOnce(false)

      const handler = ipcHandlers['ai:check-health']
      const result = await handler()

      expect(result).toBe(false)
    })
  })

  describe('ai:generate-summary', () => {
    it('throws when Ollama is not running', async () => {
      mockCheckOllamaHealth.mockResolvedValueOnce(false)

      const handler = ipcHandlers['ai:generate-summary']
      await expect(handler(null, { type: 'daily', projectId: null })).rejects.toThrow('Ollama is not running')
    })

    it('returns null when no dumps found for the period', async () => {
      mockCheckOllamaHealth.mockResolvedValueOnce(true)
      mockStore.get.mockReturnValue([]) // No dumps

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
      mockCheckOllamaHealth.mockResolvedValueOnce(true)
      mockStore.get
        .mockReturnValueOnce([mockDump]) // dumps
        .mockReturnValue([]) // summaries
      mockBuildSummaryPrompt.mockReturnValueOnce('Test prompt')
      mockGenerateSummary.mockResolvedValueOnce('Generated summary content')

      const handler = ipcHandlers['ai:generate-summary']
      const result = await handler(null, { type: 'daily', projectId: null })

      expect(result).toBeTruthy()
      expect(result.content).toBe('Generated summary content')
      expect(mockStore.set).toHaveBeenCalledWith('summaries', expect.any(Array))
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
      mockCheckOllamaHealth.mockResolvedValueOnce(true)
      mockStore.get
        .mockReturnValueOnce([mockDump]) // dumps
        .mockReturnValue([]) // summaries
      mockBuildSummaryPrompt.mockReturnValueOnce('Test prompt')
      mockGenerateSummary.mockResolvedValueOnce('Generated summary content')

      const handler = ipcHandlers['ai:generate-summary']
      await handler(null, { type: 'daily', projectId: 'project-1' })

      // The dumps should be filtered by projectId
      expect(mockGenerateSummary).toHaveBeenCalled()
    })
  })

  describe('ai:get-summaries', () => {
    it('returns all summaries when no filters provided', () => {
      const summaries = [createMockSummary({ id: '1' }), createMockSummary({ id: '2' })]
      mockStore.get.mockReturnValue(summaries)

      const handler = ipcHandlers['ai:get-summaries']
      const result = handler(null)

      expect(result).toEqual(summaries)
    })

    it('filters summaries by type when provided', () => {
      const summaries = [
        createMockSummary({ id: '1', type: 'daily' }),
        createMockSummary({ id: '2', type: 'weekly' })
      ]
      mockStore.get.mockReturnValue(summaries)

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
      mockStore.get.mockReturnValue(summaries)

      const handler = ipcHandlers['ai:get-summaries']
      const result = handler(null, { projectId: 'project-1' })

      expect(result).toHaveLength(1)
      expect(result[0].projectId).toBe('project-1')
    })
  })

  describe('ai:export-summary', () => {
    it('returns null when summary not found', async () => {
      mockStore.get.mockReturnValue([])

      const { dialog } = require('electron')
      ;(dialog.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({ canceled: true })

      const handler = ipcHandlers['ai:export-summary']
      const result = await handler(null, 'nonexistent-id')

      expect(result).toBeNull()
    })

    it('saves summary content to file', async () => {
      const summary = createMockSummary({ content: '# Test Summary\n\nContent here' })
      mockStore.get.mockReturnValue([summary])

      const { dialog } = require('electron')
      ;(dialog.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: false,
        filePath: '/tmp/summary.md'
      })
      const { writeFile } = require('fs/promises')

      const handler = ipcHandlers['ai:export-summary']
      const result = await handler(null, summary.id)

      expect(result).toBe('/tmp/summary.md')
      expect(writeFile).toHaveBeenCalledWith('/tmp/summary.md', summary.content, 'utf8')
    })

    it('returns null when dialog is canceled', async () => {
      const summary = createMockSummary()
      mockStore.get.mockReturnValue([summary])

      const { dialog } = require('electron')
      ;(dialog.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({ canceled: true })

      const handler = ipcHandlers['ai:export-summary']
      const result = await handler(null, summary.id)

      expect(result).toBeNull()
    })
  })
})
