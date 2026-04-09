import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SummarySettings } from '../renderer/lib/types'
import {
  checkSummaryHealth,
  generateSummary,
  buildSummaryPrompt,
  GenerateSummaryOptions,
  sanitizeSummarySettings,
  getDefaultSummarySettings
} from './ai-service'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('ai-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('checkSummaryHealth', () => {
    it('returns false when Ollama is unavailable (fetch throws)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await checkSummaryHealth()

      expect(result).toBe(false)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('returns true when OpenAI-compatible health check succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      })

      const result = await checkSummaryHealth({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1/',
        apiKey: 'sk-test',
        model: 'gpt-4.1-mini'
      })

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: { Authorization: 'Bearer sk-test' }
        })
      )
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

    it('calls OpenAI-compatible /chat/completions and returns content string', async () => {
      const settings: SummarySettings = {
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4.1-mini'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: { content: 'OpenAI summary' }
            }
          ]
        })
      })

      const result = await generateSummary('Test prompt', settings)

      expect(result).toBe('OpenAI summary')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer sk-test'
          },
          body: JSON.stringify({
            model: 'gpt-4.1-mini',
            messages: [{ role: 'user', content: 'Test prompt' }]
          })
        })
      )
    })

    it('throws on non-ok Ollama response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => ''
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

    it('throws when OpenAI API key is missing', async () => {
      await expect(generateSummary('test prompt', {
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4.1-mini'
      })).rejects.toThrow('OpenAI API key is missing')
    })
  })

  describe('settings helpers', () => {
    it('normalizes and fills missing settings values', () => {
      expect(sanitizeSummarySettings({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1/',
        apiKey: '  sk-test  ',
        model: '  gpt-4.1-mini  '
      })).toEqual({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4.1-mini'
      })
    })

    it('returns provider defaults', () => {
      expect(getDefaultSummarySettings('ollama')).toEqual({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        apiKey: '',
        model: 'mistral'
      })
      expect(getDefaultSummarySettings('openai')).toEqual({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4.1-mini'
      })
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

      expect(prompt).toContain('[1] dump 0')
      expect(prompt).toContain('[100] dump 99')
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
  })
})
