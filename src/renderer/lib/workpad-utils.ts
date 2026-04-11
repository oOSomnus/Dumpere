import type { DumpEntry } from '@/shared/types'

export function appendMarkdownSection(existingContent: string, section: string): string {
  const trimmedExisting = existingContent.trimEnd()
  const trimmedSection = section.trim()

  if (!trimmedExisting) {
    return `${trimmedSection}\n`
  }

  return `${trimmedExisting}\n\n${trimmedSection}\n`
}

export function formatDumpReference(dump: DumpEntry): string {
  return `[[dump:${dump.id}]]`
}

export function formatDumpReferences(dumps: DumpEntry[]): string {
  return dumps.map(formatDumpReference).join('\n\n')
}

export function getDefaultWorkspaceNotePath(): string {
  return 'index.md'
}
