import type { DumpEntry } from './types'

function formatDumpTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(timestamp))
}

export function appendMarkdownSection(existingContent: string, section: string): string {
  const trimmedExisting = existingContent.trimEnd()
  const trimmedSection = section.trim()

  if (!trimmedExisting) {
    return `${trimmedSection}\n`
  }

  return `${trimmedExisting}\n\n${trimmedSection}\n`
}

export function formatDumpReference(dump: DumpEntry): string {
  const lines = [`### Dump Reference (${formatDumpTimestamp(dump.createdAt)})`]

  if (dump.text.trim()) {
    lines.push('', dump.text.trim())
  }

  if (dump.files.length > 0) {
    lines.push('', `Attachments: ${dump.files.map(file => file.originalName).join(', ')}`)
  }

  return lines.join('\n')
}

export function formatDumpReferences(dumps: DumpEntry[]): string {
  return dumps.map(formatDumpReference).join('\n\n')
}
