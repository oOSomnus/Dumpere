import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkOllamaHealth, generateSummary, buildSummaryPrompt, GenerateSummaryOptions } from './ai-service'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('ai-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('checkOllamaHealth', () => {
    it('returns false when Ollama is unavailable (fetch throws)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await checkOllamaHealth()

      expect(result).toBe(false)
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/', expect.objectContaining({ method: 'GET' }))
    })

    it('returns false when Ollama returns non-ok status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      const result = await checkOllamaHealth()

      expect(result).toBe(false)
    })

    it('returns true when Ollama responds with ok status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      })

      const result = await checkOllamaHealth()

      expect(result).toBe(true)
    })
  })

  describe('generateSummary', () => {
    it('calls Ollama /api/chat and returns content string', async () => {
      const mockContent = 'This is a test summary'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          message: { content: mockContent }
        })
      })

      const prompt = 'Test prompt'
      const result = await generateSummary(prompt)

      expect(result).toBe(mockContent)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'mistral',
            messages: [{ role: 'user', content: prompt }],
            stream: false
          })
        })
      )
    })

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      await expect(generateSummary('test prompt')).rejects.toThrow('Ollama API error: 500 Internal Server Error')
    })

    it('throws on malformed response (not an object)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => 'not an object'
      })

      await expect(generateSummary('test prompt')).rejects.toThrow('Invalid Ollama response: not an object')
    })

    it('throws on missing message property', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ noMessage: true })
      })

      await expect(generateSummary('test prompt')).rejects.toThrow('Invalid Ollama response: malformed message structure')
    })

    it('throws on non-string message content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: { content: 123 } })
      })

      await expect(generateSummary('test prompt')).rejects.toThrow('Invalid Ollama response: malformed message structure')
    })
  })

  describe('buildSummaryPrompt', () => {
    const createDump = (text: string, files: Array<{ originalName: string }> = []): GenerateSummaryOptions['dumps'][0] => ({
      id: crypto.randomUUID(),
      text,
      files,
      createdAt: Date.now()
    })

    it('truncates text longer than MAX_CHARS_PER_DUMP (500 chars)', () => {
      const longText = 'a'.repeat(600)
      const options: GenerateSummaryOptions = {
        type: 'daily',
        projectId: null,
        dumps: [createDump(longText)]
      }

      const prompt = buildSummaryPrompt(options)

      // Should truncate to 500 chars + '...'
      expect(prompt).toContain('a'.repeat(500) + '...')
    })

    it('limits dumps to MAX_DUMPS_PER_SUMMARY (100 dumps)', () => {
      const dumps = Array.from({ length: 150 }, (_, i) => createDump(`dump ${i}`))
      const options: GenerateSummaryOptions = {
        type: 'weekly',
        projectId: null,
        dumps
      }

      const prompt = buildSummaryPrompt(options)

      // Should contain dump 0 and dump 99 (first and last of the 100)
      expect(prompt).toContain('[1] dump 0')
      expect(prompt).toContain('[100] dump 99')
      // Should not contain dump 100
      expect(prompt).not.toContain('[101]')
    })

    it('includes file names when dumps have files', () => {
      const options: GenerateSummaryOptions = {
        type: 'daily',
        projectId: null,
        dumps: [createDump('test dump', [{ originalName: 'file1.png' }, { originalName: 'file2.jpg' }])]
      }

      const prompt = buildSummaryPrompt(options)

      expect(prompt).toContain('[Files: file1.png, file2.jpg]')
    })

    it('uses "today" for daily summaries', () => {
      const options: GenerateSummaryOptions = {
        type: 'daily',
        projectId: null,
        dumps: []
      }

      const prompt = buildSummaryPrompt(options)

      expect(prompt).toContain('from today')
      expect(prompt).toContain('No dumps recorded today')
    })

    it('uses "this week" for weekly summaries', () => {
      const options: GenerateSummaryOptions = {
        type: 'weekly',
        projectId: null,
        dumps: []
      }

      const prompt = buildSummaryPrompt(options)

      expect(prompt).toContain('from this week')
      expect(prompt).toContain('No dumps recorded this week')
    })
  })
})
