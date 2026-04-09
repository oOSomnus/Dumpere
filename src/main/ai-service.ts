import log from 'electron-log'
import { SummarySettings } from '../renderer/lib/types'

const DEFAULT_OLLAMA_SETTINGS: SummarySettings = {
  provider: 'ollama',
  baseUrl: 'http://localhost:11434',
  apiKey: '',
  model: 'mistral'
}

const DEFAULT_OPENAI_SETTINGS: SummarySettings = {
  provider: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4.1-mini'
}

const MAX_DUMPS_PER_SUMMARY = 100
const MAX_CHARS_PER_DUMP = 500

export interface GenerateSummaryOptions {
  type: 'daily' | 'weekly'
  projectId: string | null
  workpadContent?: string
  dumps: Array<{
    id: string
    text: string
    files: Array<{ originalName: string }>
    createdAt: number
  }>
}

export function getDefaultSummarySettings(provider: SummarySettings['provider'] = 'ollama'): SummarySettings {
  return provider === 'openai'
    ? { ...DEFAULT_OPENAI_SETTINGS }
    : { ...DEFAULT_OLLAMA_SETTINGS }
}

export function sanitizeSummarySettings(input?: Partial<SummarySettings> | null): SummarySettings {
  const provider = input?.provider === 'openai' ? 'openai' : 'ollama'
  const defaults = getDefaultSummarySettings(provider)

  return {
    provider,
    baseUrl: normalizeBaseUrl(input?.baseUrl || defaults.baseUrl),
    apiKey: input?.apiKey?.trim() ?? defaults.apiKey,
    model: input?.model?.trim() || defaults.model,
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

function buildHealthUrl(settings: SummarySettings): string {
  return settings.provider === 'openai'
    ? `${settings.baseUrl}/models`
    : `${settings.baseUrl}/`
}

function buildSummaryUrl(settings: SummarySettings): string {
  return settings.provider === 'openai'
    ? `${settings.baseUrl}/chat/completions`
    : `${settings.baseUrl}/api/chat`
}

function buildHeaders(settings: SummarySettings): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (settings.provider === 'openai') {
    headers.Authorization = `Bearer ${settings.apiKey}`
  }

  return headers
}

function validateSummarySettings(settings: SummarySettings): void {
  if (!settings.baseUrl) {
    throw new Error('Summary API base URL is missing. Add it in Settings first.')
  }

  if (!settings.model) {
    throw new Error('Summary model is missing. Add it in Settings first.')
  }

  if (settings.provider === 'openai' && !settings.apiKey) {
    throw new Error('OpenAI API key is missing. Add it in Settings first.')
  }
}

/**
 * Check if the configured summary backend is running and healthy.
 */
export async function checkSummaryHealth(settingsInput?: Partial<SummarySettings> | null): Promise<boolean> {
  try {
    const settings = sanitizeSummarySettings(settingsInput)
    validateSummarySettings(settings)

    const response = await fetch(buildHealthUrl(settings), {
      method: 'GET',
      headers: settings.provider === 'openai'
        ? { Authorization: `Bearer ${settings.apiKey}` }
        : undefined,
      signal: AbortSignal.timeout(3000)
    })
    return response.ok
  } catch (error) {
    log.warn('Summary health check failed:', error)
    return false
  }
}

/**
 * Build a summary prompt from dump entries.
 */
export function buildSummaryPrompt(options: GenerateSummaryOptions): string {
  const { type, dumps, workpadContent = '' } = options
  const timeLabel = type === 'daily' ? 'today' : 'this week'
  const normalizedWorkpad = workpadContent.trim()

  const limitedDumps = dumps.slice(0, MAX_DUMPS_PER_SUMMARY)
  const dumpTexts = limitedDumps.map((dump, i) => {
    const truncated = dump.text.length > MAX_CHARS_PER_DUMP
      ? dump.text.slice(0, MAX_CHARS_PER_DUMP) + '...'
      : dump.text
    const files = dump.files.length > 0
      ? `\n[Files: ${dump.files.map(f => f.originalName).join(', ')}]`
      : ''
    return `[${i + 1}] ${truncated}${files}`
  }).join('\n\n')

  const workpadSection = normalizedWorkpad
    ? `Project workpad context:
${normalizedWorkpad}

Use the workpad only as supporting context. The summary must still reflect the actual dump entries from ${timeLabel}.

`
    : ''

  return `You are a concise work journal. Given the following dump entries from ${timeLabel}, write a brief summary that:
1. Captures the key themes and accomplishments
2. Groups related items together
3. Uses markdown formatting with headers (##) and bullet points (-)
4. Stays under 300 words
5. If there are no dumps, say "No dumps recorded ${timeLabel}."

${workpadSection}Dumps:
${dumpTexts}

Summary:`
}

function extractOpenAIContent(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    const text = content
      .filter((part): part is { type: string; text: string } => (
        typeof part === 'object' &&
        part !== null &&
        'type' in part &&
        'text' in part &&
        typeof (part as { type?: unknown }).type === 'string' &&
        typeof (part as { text?: unknown }).text === 'string'
      ))
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join('\n')

    if (text) {
      return text
    }
  }

  throw new Error('Invalid OpenAI response: malformed message content')
}

async function buildErrorMessage(response: Response, providerLabel: string): Promise<string> {
  try {
    const errorText = await response.text()
    if (errorText) {
      return `${providerLabel} API error: ${response.status} ${response.statusText} - ${errorText}`
    }
  } catch {
    // Ignore body parsing errors and fall back to the status line.
  }

  return `${providerLabel} API error: ${response.status} ${response.statusText}`
}

/**
 * Generate a summary via the configured AI provider.
 */
export async function generateSummary(
  prompt: string,
  settingsInput?: Partial<SummarySettings> | null
): Promise<string> {
  const settings = sanitizeSummarySettings(settingsInput)
  validateSummarySettings(settings)

  const providerLabel = settings.provider === 'openai' ? 'OpenAI' : 'Ollama'
  const requestBody = settings.provider === 'openai'
    ? {
        model: settings.model,
        messages: [{ role: 'user', content: prompt }],
      }
    : {
        model: settings.model,
        messages: [{ role: 'user', content: prompt }],
        stream: false
      }

  const response = await fetch(buildSummaryUrl(settings), {
    method: 'POST',
    headers: buildHeaders(settings),
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(120000)
  })

  if (!response.ok) {
    throw new Error(await buildErrorMessage(response, providerLabel))
  }

  const data = await response.json()
  if (!data || typeof data !== 'object') {
    throw new Error(`Invalid ${providerLabel} response: not an object`)
  }

  if (settings.provider === 'openai') {
    const responseData = data as { choices?: unknown }
    const choice = Array.isArray(responseData.choices) ? responseData.choices[0] : null
    const content = choice && typeof choice === 'object' && 'message' in choice
      ? (choice as { message?: { content?: unknown } }).message?.content
      : undefined

    return extractOpenAIContent(content)
  }

  const content = (data as { message?: { content?: unknown } }).message?.content
  if (typeof content !== 'string') {
    throw new Error('Invalid Ollama response: malformed message structure')
  }

  return content
}
