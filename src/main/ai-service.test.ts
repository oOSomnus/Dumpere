import { describe, it, expect, vi, beforeEach } from 'vitest'
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
    mockFetch.mockReset()
  })

  describe('checkSummaryHealth', () => {
    it('returns false when OpenAI is unavailable (fetch throws)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await checkSummaryHealth({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4.1-mini'
      })

      expect(result).toBe(false)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: { Authorization: 'Bearer sk-test' }
        })
      )
    })

    it('returns true when OpenAI-compatible health check succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] })
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

    it('returns true when Claude health check succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      })

      const result = await checkSummaryHealth({
        provider: 'claude',
        baseUrl: 'https://api.anthropic.com/v1/',
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-latest'
      })

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'x-api-key': 'sk-ant-test',
            'anthropic-version': '2023-06-01'
          }
        })
      )
    })
  })

  describe('generateSummary', () => {
    it('calls Claude /messages and returns content string', async () => {
      const mockContent = 'This is a Claude summary'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          content: [{ type: 'text', text: mockContent }]
        })
      })

      const prompt = 'Test prompt'
      const result = await generateSummary(prompt, {
        provider: 'claude',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-latest'
      })

      expect(result).toBe(mockContent)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'sk-ant-test',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-latest',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }]
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

    it('throws on non-ok Claude response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => ''
      })

      await expect(generateSummary('test prompt', {
        provider: 'claude',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-latest'
      })).rejects.toThrow('Claude API error: 500 Internal Server Error')
    })

    it('throws on malformed response (not an object)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => 'not an object'
      })

      await expect(generateSummary('test prompt', {
        provider: 'claude',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-latest'
      })).rejects.toThrow('Invalid Claude response: not an object')
    })

    it('throws when OpenAI API key is missing', async () => {
      await expect(generateSummary('test prompt', {
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4.1-mini'
      })).rejects.toThrow('OpenAI API key is missing')
    })

    it('throws when Claude API key is missing', async () => {
      await expect(generateSummary('test prompt', {
        provider: 'claude',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: '',
        model: 'claude-3-5-sonnet-latest'
      })).rejects.toThrow('Claude API key is missing')
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
      expect(getDefaultSummarySettings('openai')).toEqual({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4.1-mini'
      })
      expect(getDefaultSummarySettings('claude')).toEqual({
        provider: 'claude',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: '',
        model: 'claude-3-5-sonnet-latest'
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
