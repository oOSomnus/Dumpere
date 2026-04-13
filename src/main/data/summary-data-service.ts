import { writeFile as writeFileFs } from 'fs/promises'
import type { DumpEntry, SummaryEntry, SummarySettings } from '@/shared/types'
import {
  buildSummaryPrompt,
  checkSummaryHealth,
  generateSummary as generateSummaryText
} from '../ai-service'
import {
  getDefaultWorkspaceNotePath,
  readWorkspaceNote,
  updateWorkspaceNote
} from '../workspace-service'
import { enqueueWrite, readActiveMetadata, readMetadata, requireVaultPath, writeMetadata } from './repository-context'

function appendMarkdownSection(existingContent: string, section: string): string {
  const trimmedExisting = existingContent.trimEnd()
  const trimmedSection = section.trim()

  if (!trimmedExisting) {
    return `${trimmedSection}\n`
  }

  return `${trimmedExisting}\n\n${trimmedSection}\n`
}

function buildSummaryWorkpadSection(summary: SummaryEntry): string {
  const stamp = new Date(summary.generatedAt).toLocaleString()
  const label = summary.type === 'daily' ? 'AI Daily Summary' : 'AI Weekly Summary'
  return `## ${label} (${stamp})\n\n${summary.content.trim()}`
}

function filterSummaryDumps(
  dumps: DumpEntry[],
  options: { type: 'daily' | 'weekly'; projectId: string | null }
): DumpEntry[] {
  let nextDumps = [...dumps]
  if (options.projectId) {
    nextDumps = nextDumps.filter((dump) => dump.projectId === options.projectId)
  }

  const now = Date.now()
  const rangeStart = options.type === 'daily'
    ? new Date().setHours(0, 0, 0, 0)
    : new Date().setDate(new Date().getDate() - 7)

  return nextDumps.filter((dump) => dump.createdAt >= rangeStart && dump.createdAt <= now)
}

export async function getSummaries(filters?: { type?: 'daily' | 'weekly'; projectId?: string | null }): Promise<SummaryEntry[]> {
  const summaries = (await readActiveMetadata()).summaries
  return summaries
    .filter((summary) => (filters?.type ? summary.type === filters.type : true))
    .filter((summary) => (
      typeof filters?.projectId === 'undefined'
        ? true
        : summary.projectId === filters.projectId
    ))
    .sort((a, b) => b.generatedAt - a.generatedAt)
}

export async function generateSummary(
  options: { type: 'daily' | 'weekly'; projectId: string | null },
  settings: SummarySettings
): Promise<SummaryEntry | null> {
  const vaultPath = requireVaultPath()
  const metadata = await readMetadata(vaultPath)

  const isHealthy = await checkSummaryHealth(settings)
  if (!isHealthy) {
    const providerLabel = settings.provider === 'openai' ? 'OpenAI' : 'Claude'
    throw new Error(`${providerLabel} is unavailable. Check your summary settings and connection.`)
  }

  const dumps = filterSummaryDumps(metadata.dumps, options)
  if (dumps.length === 0) {
    return null
  }

  let workpadContent = ''
  if (options.projectId) {
    const note = await readWorkspaceNote(options.projectId, getDefaultWorkspaceNotePath())
    workpadContent = note.content
  }

  const prompt = buildSummaryPrompt({
    type: options.type,
    projectId: options.projectId,
    dumps,
    workpadContent
  })
  const content = await generateSummaryText(prompt, settings)

  const summary: SummaryEntry = {
    id: crypto.randomUUID(),
    type: options.type,
    projectId: options.projectId,
    generatedAt: Date.now(),
    content,
    dumpCount: dumps.length
  }

  await enqueueWrite(async () => {
    const latestMetadata = await readMetadata(vaultPath)
    latestMetadata.summaries.unshift(summary)
    await writeMetadata(vaultPath, latestMetadata)
  })

  if (options.projectId) {
    const latestNote = await readWorkspaceNote(options.projectId, getDefaultWorkspaceNotePath())
    await updateWorkspaceNote(
      options.projectId,
      latestNote.path,
      appendMarkdownSection(latestNote.content, buildSummaryWorkpadSection(summary))
    )
  }

  return summary
}

export async function exportSummary(summaryId: string, outputPath: string): Promise<string | null> {
  const summary = (await readActiveMetadata()).summaries.find((entry) => entry.id === summaryId)
  if (!summary) {
    return null
  }

  await writeFileFs(outputPath, summary.content, 'utf8')
  return outputPath
}
