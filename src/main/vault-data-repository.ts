import { app } from 'electron'
import log from 'electron-log'
import archiver from 'archiver'
import AdmZip from 'adm-zip'
import { createWriteStream } from 'fs'
import { writeFile as writeFileFs } from 'fs/promises'
import { join } from 'path'
import {
  type CreateDumpInput,
  type DumpEntry,
  type SummaryEntry,
  type SummarySettings,
  type Tag,
  type UpdateDumpInput,
  type VaultMetadata,
  type Project
} from '@/shared/types'
import {
  copyFilesToVault,
  deleteVaultFile,
  getMimeType,
  resolveVaultFilePath
} from './file-service'
import {
  createEmptyMetadata,
  readMetadata,
  writeMetadata
} from './metadata-service'
import { getVaultState } from './vault-service'
import {
  deleteProjectWorkspace,
  ensureProjectWorkspace,
  getDefaultWorkspaceNotePath,
  readWorkspaceNote,
  updateWorkspaceNote
} from './workspace-service'
import {
  buildSummaryPrompt,
  checkSummaryHealth,
  generateSummary as generateSummaryText
} from './ai-service'

const MAX_PROJECT_NAME_LENGTH = 50
const PROJECT_NAME_REGEX = /^[a-zA-Z0-9\s]+$/
const MAX_TAG_NAME_LENGTH = 30
const TAG_NAME_REGEX = /^(?=.*[a-zA-Z0-9])[a-zA-Z0-9 -]+$/
const MAX_EXPORTS = 1000
const MAX_IMPORT_FILES = 1000
const MAX_ZIP_SIZE = 100 * 1024 * 1024

let writeQueue = Promise.resolve()

function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(operation, operation)
  writeQueue = next.then(() => undefined, () => undefined)
  return next
}

function requireVaultPath(): string {
  const state = getVaultState()
  if (!state.isOpen || !state.vaultPath) {
    throw new Error('No vault open')
  }

  return state.vaultPath
}

async function readActiveMetadata(): Promise<VaultMetadata> {
  return readMetadata(requireVaultPath())
}

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

function normalizeProjectName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('Project name is required')
  }
  if (trimmed.length > MAX_PROJECT_NAME_LENGTH) {
    throw new Error(`Project name must be ${MAX_PROJECT_NAME_LENGTH} characters or less`)
  }
  if (!PROJECT_NAME_REGEX.test(trimmed)) {
    throw new Error('Project name must contain only alphanumeric characters and spaces')
  }
  return trimmed
}

function normalizeTagName(name: string): string {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!normalized) {
    throw new Error('Tag name is required')
  }
  if (normalized.length > MAX_TAG_NAME_LENGTH) {
    throw new Error(`Tag name must be ${MAX_TAG_NAME_LENGTH} characters or less`)
  }
  if (!TAG_NAME_REGEX.test(normalized)) {
    throw new Error('Tag name must contain only alphanumeric characters, spaces, and hyphens')
  }
  return normalized
}

function ensureProjectExists(metadata: VaultMetadata, projectId: string | null): void {
  if (!projectId) {
    return
  }

  if (!metadata.projects.some((project) => project.id === projectId)) {
    throw new Error('Project not found')
  }
}

function normalizeTagIds(metadata: VaultMetadata, tagIds: string[]): string[] {
  const knownTagIds = new Set(metadata.tags.map((tag) => tag.id))
  return [...new Set(tagIds)].filter((tagId) => knownTagIds.has(tagId))
}

export async function initializeVaultData(): Promise<void> {
  const vaultPath = requireVaultPath()
  try {
    await readMetadata(vaultPath)
  } catch (error) {
    log.warn('Initializing empty metadata for active vault', error)
    await writeMetadata(vaultPath, createEmptyMetadata())
  }
}

export async function getProjects(): Promise<Project[]> {
  return (await readActiveMetadata()).projects
}

export async function createProject(name: string): Promise<Project> {
  const normalizedName = normalizeProjectName(name)
  const createdProject: Project = {
    id: crypto.randomUUID(),
    name: normalizedName,
    createdAt: Date.now()
  }

  await enqueueWrite(async () => {
    const vaultPath = requireVaultPath()
    const metadata = await readMetadata(vaultPath)
    metadata.projects.unshift(createdProject)
    await writeMetadata(vaultPath, metadata)
  })

  await ensureProjectWorkspace(createdProject.id)
  return createdProject
}

export async function updateProject(id: string, name: string): Promise<Project> {
  const normalizedName = normalizeProjectName(name)

  return enqueueWrite(async () => {
    const vaultPath = requireVaultPath()
    const metadata = await readMetadata(vaultPath)
    const project = metadata.projects.find((entry) => entry.id === id)

    if (!project) {
      throw new Error('Project not found')
    }

    project.name = normalizedName
    await writeMetadata(vaultPath, metadata)
    return { ...project }
  })
}

export async function deleteProject(id: string): Promise<void> {
  await enqueueWrite(async () => {
    const vaultPath = requireVaultPath()
    const metadata = await readMetadata(vaultPath)

    metadata.projects = metadata.projects.filter((project) => project.id !== id)
    metadata.dumps = metadata.dumps.map((dump) => (
      dump.projectId === id
        ? { ...dump, projectId: null, updatedAt: Date.now() }
        : dump
    ))
    metadata.summaries = metadata.summaries.filter((summary) => summary.projectId !== id)

    await writeMetadata(vaultPath, metadata)
  })

  await deleteProjectWorkspace(id)
}

export async function getTags(): Promise<Tag[]> {
  return (await readActiveMetadata()).tags
}

export async function createTag(name: string): Promise<Tag> {
  const normalizedName = normalizeTagName(name)

  return enqueueWrite(async () => {
    const vaultPath = requireVaultPath()
    const metadata = await readMetadata(vaultPath)
    const existing = metadata.tags.find((tag) => tag.name.toLowerCase() === normalizedName)

    if (existing) {
      return { ...existing }
    }

    const createdTag: Tag = {
      id: crypto.randomUUID(),
      name: normalizedName,
      createdAt: Date.now()
    }

    metadata.tags.unshift(createdTag)
    await writeMetadata(vaultPath, metadata)
    return createdTag
  })
}

export async function deleteTag(id: string): Promise<void> {
  await enqueueWrite(async () => {
    const vaultPath = requireVaultPath()
    const metadata = await readMetadata(vaultPath)

    metadata.tags = metadata.tags.filter((tag) => tag.id !== id)
    metadata.dumps = metadata.dumps.map((dump) => ({
      ...dump,
      tags: dump.tags.filter((tagId) => tagId !== id)
    }))

    await writeMetadata(vaultPath, metadata)
  })
}

export async function getDumps(): Promise<DumpEntry[]> {
  return (await readActiveMetadata()).dumps.sort((a, b) => b.createdAt - a.createdAt)
}

export async function createDump(input: CreateDumpInput): Promise<DumpEntry> {
  if (!input.projectId) {
    throw new Error('Project assignment is required before saving a dump')
  }

  const vaultPath = requireVaultPath()
  let createdFiles: DumpEntry['files'] = []

  try {
    createdFiles = await copyFilesToVault(vaultPath, input.filePaths)

    return enqueueWrite(async () => {
      const metadata = await readMetadata(vaultPath)
      ensureProjectExists(metadata, input.projectId)

      const createdDump: DumpEntry = {
        id: crypto.randomUUID(),
        text: input.text,
        files: createdFiles,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        projectId: input.projectId,
        tags: normalizeTagIds(metadata, input.tagIds)
      }

      metadata.dumps.unshift(createdDump)
      await writeMetadata(vaultPath, metadata)
      return createdDump
    })
  } catch (error) {
    await Promise.all(createdFiles.map(async (file) => {
      try {
        await deleteVaultFile(vaultPath, file.storedPath)
      } catch (cleanupError) {
        log.warn(`Failed to clean up ${file.storedPath}`, cleanupError)
      }
    }))
    throw error
  }
}

export async function updateDump(id: string, updates: UpdateDumpInput): Promise<DumpEntry> {
  return enqueueWrite(async () => {
    const vaultPath = requireVaultPath()
    const metadata = await readMetadata(vaultPath)
    const dump = metadata.dumps.find((entry) => entry.id === id)

    if (!dump) {
      throw new Error('Dump not found')
    }

    if (updates.projectId !== undefined) {
      ensureProjectExists(metadata, updates.projectId)
      dump.projectId = updates.projectId
    }

    if (updates.tags !== undefined) {
      dump.tags = normalizeTagIds(metadata, updates.tags)
    }

    dump.updatedAt = Date.now()
    await writeMetadata(vaultPath, metadata)
    return { ...dump, files: dump.files.map((file) => ({ ...file })), tags: [...dump.tags] }
  })
}

export async function deleteDump(id: string): Promise<void> {
  await enqueueWrite(async () => {
    const vaultPath = requireVaultPath()
    const metadata = await readMetadata(vaultPath)
    const dump = metadata.dumps.find((entry) => entry.id === id)

    if (!dump) {
      return
    }

    metadata.dumps = metadata.dumps.filter((entry) => entry.id !== id)
    await writeMetadata(vaultPath, metadata)

    await Promise.all(dump.files.map((file) => (
      deleteVaultFile(vaultPath, file.storedPath).catch((error) => {
        log.warn(`Failed to delete attachment ${file.storedPath}`, error)
      })
    )))
  })
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

  let dumps = [...metadata.dumps]
  if (options.projectId) {
    dumps = dumps.filter((dump) => dump.projectId === options.projectId)
  }

  const now = Date.now()
  const rangeStart = options.type === 'daily'
    ? new Date().setHours(0, 0, 0, 0)
    : new Date().setDate(new Date().getDate() - 7)

  dumps = dumps.filter((dump) => dump.createdAt >= rangeStart && dump.createdAt <= now)
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

export async function exportDumps(dumpIds: string[], projectName: string, outputPath: string): Promise<string | null> {
  const vaultPath = requireVaultPath()
  const metadata = await readMetadata(vaultPath)
  const selectedDumpIds = dumpIds.slice(0, MAX_EXPORTS)
  const selectedDumps = metadata.dumps
    .filter((dump) => selectedDumpIds.includes(dump.id))
    .sort((a, b) => a.createdAt - b.createdAt)

  if (selectedDumps.length === 0) {
    return null
  }

  const dateMap = new Map<string, DumpEntry[]>()
  for (const dump of selectedDumps) {
    const dateKey = new Date(dump.createdAt).toISOString().split('T')[0]
    const current = dateMap.get(dateKey) ?? []
    current.push(dump)
    dateMap.set(dateKey, current)
  }

  const lines: string[] = [`# ${projectName}`, '']
  for (const [date, dumpsForDate] of dateMap) {
    lines.push(`## ${date}`, '')
    for (const dump of dumpsForDate) {
      const time = new Date(dump.createdAt).toTimeString().split(' ')[0].slice(0, 5)
      lines.push(`### ${time}`, '')
      if (dump.text) {
        lines.push(dump.text, '')
      }
      for (const file of dump.files) {
        lines.push(`![${file.originalName}](./assets/${file.originalName})`, '')
      }
    }
  }

  const markdown = lines.join('\n')

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(outputPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', resolve)
    archive.on('error', reject)
    archive.pipe(output)
    archive.append(markdown, { name: `${projectName}.md` })

    selectedDumps.forEach((dump) => {
      dump.files.forEach((file) => {
        archive.file(resolveVaultFilePath(vaultPath, file.storedPath), { name: `assets/${file.originalName}` })
      })
    })

    void archive.finalize()
  })

  return outputPath
}

export async function importDumps(zipPath: string, projectId: string): Promise<number> {
  const vaultPath = requireVaultPath()
  const zip = new AdmZip(zipPath)
  const entries = zip.getEntries()

  const totalSize = entries.reduce((sum, entry) => sum + entry.header.size, 0)
  if (totalSize > MAX_ZIP_SIZE) {
    throw new Error('ZIP file is too large (max 100MB)')
  }

  const markdownEntry = entries.find((entry) => entry.entryName.endsWith('.md') && !entry.entryName.includes('/'))
  if (!markdownEntry) {
    throw new Error('Invalid ZIP: no markdown file found')
  }

  const markdown = markdownEntry.getData().toString('utf8')
  const importedDumps: Array<{ text: string; files: DumpEntry['files']; createdAt: number }> = []
  const dateSections = markdown.split(/(?=^## )/m).filter((section) => section.trim())

  for (const section of dateSections) {
    const lines = section.split('\n')
    const dateMatch = lines[0]?.match(/^## (\d{4}-\d{2}-\d{2})/)
    if (!dateMatch) {
      continue
    }

    const timeSections = section.split(/(?=^### )/m).filter((item) => item.trim())
    for (const timeSection of timeSections) {
      const timeLines = timeSection.split('\n')
      const timeMatch = timeLines[0]?.match(/^### (\d{2}:\d{2})/)
      if (!timeMatch) {
        continue
      }

      const date = dateMatch[1]
      const time = timeMatch[1]
      const contentLines: string[] = []
      const fileRefs: string[] = []

      for (const line of timeLines.slice(1)) {
        if (line.startsWith('## ') || line.startsWith('### ')) {
          break
        }

        if (line.startsWith('![')) {
          const refMatch = line.match(/!\[[^\]]*]\(\.\/assets\/([^)]+)\)/)
          if (refMatch) {
            fileRefs.push(refMatch[1])
          }
          contentLines.push(line)
        } else {
          contentLines.push(line)
        }
      }

      const text = contentLines.filter((line) => !line.startsWith('![')).join('\n').trim()
      const createdAt = new Date(`${date}T${time}:00`).getTime() || Date.now()
      const files: DumpEntry['files'] = []

      for (const fileRef of fileRefs) {
        const assetEntry = entries.find((entry) => entry.entryName === `assets/${fileRef}`)
        if (!assetEntry || assetEntry.isDirectory) {
          continue
        }
        if (assetEntry.entryName.includes('..')) {
          continue
        }

        const tempPath = join(app.getPath('temp'), `dumpere-import-${Date.now()}-${fileRef}`)
        await writeFileFs(tempPath, assetEntry.getData())
        try {
          const [created] = await copyFilesToVault(vaultPath, [tempPath])
          if (created) {
            files.push(created)
          }
        } finally {
          void import('fs/promises').then((fs) => fs.unlink(tempPath).catch(() => undefined))
        }
      }

      importedDumps.push({ text, files, createdAt })
      if (importedDumps.length >= MAX_IMPORT_FILES) {
        break
      }
    }

    if (importedDumps.length >= MAX_IMPORT_FILES) {
      break
    }
  }

  await enqueueWrite(async () => {
    const metadata = await readMetadata(vaultPath)
    ensureProjectExists(metadata, projectId)

    importedDumps.forEach((dump) => {
      metadata.dumps.unshift({
        id: crypto.randomUUID(),
        text: dump.text,
        files: dump.files,
        createdAt: dump.createdAt,
        updatedAt: Date.now(),
        projectId,
        tags: []
      })
    })

    await writeMetadata(vaultPath, metadata)
  })

  return importedDumps.length
}
