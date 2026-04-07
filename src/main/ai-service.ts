import log from 'electron-log'

const OLLAMA_BASE = 'http://localhost:11434'
const DEFAULT_MODEL = 'mistral'
const MAX_DUMPS_PER_SUMMARY = 100
const MAX_CHARS_PER_DUMP = 500

export interface GenerateSummaryOptions {
  type: 'daily' | 'weekly'
  projectId: string | null
  dumps: Array<{
    id: string
    text: string
    files: Array<{ originalName: string }>
    createdAt: number
  }>
}

/**
 * Check if Ollama server is running and healthy
 */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE}/`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    })
    return response.ok
  } catch (error) {
    log.warn('Ollama health check failed:', error)
    return false
  }
}

/**
 * Build a summary prompt from dump entries
 */
export function buildSummaryPrompt(options: GenerateSummaryOptions): string {
  const { type, dumps } = options
  const timeLabel = type === 'daily' ? 'today' : 'this week'

  // Limit dumps and truncate text
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

  return `You are a concise work journal. Given the following dump entries from ${timeLabel}, write a brief summary that:
1. Captures the key themes and accomplishments
2. Groups related items together
3. Uses markdown formatting with headers (##) and bullet points (-)
4. Stays under 300 words
5. If there are no dumps, say "No dumps recorded ${timeLabel}."

Dumps:
${dumpTexts}

Summary:`
}

/**
 * Generate a summary by calling Ollama
 */
export async function generateSummary(
  prompt: string,
  model = DEFAULT_MODEL
): Promise<string> {
  const response = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: false
    }),
    signal: AbortSignal.timeout(120000) // 2 minute timeout
  })

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid Ollama response: not an object')
  }
  if (!data.message || typeof data.message.content !== 'string') {
    throw new Error('Invalid Ollama response: malformed message structure')
  }
  return data.message.content
}
