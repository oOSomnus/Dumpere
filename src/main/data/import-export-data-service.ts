import { app } from 'electron'
import archiver from 'archiver'
import AdmZip from 'adm-zip'
import { createWriteStream } from 'fs'
import { writeFile as writeFileFs } from 'fs/promises'
import { join } from 'path'
import type { DumpEntry } from '@/shared/types'
import { sanitizeFilenameForExport } from '@/shared/naming'
import { copyFilesToVault, resolveVaultFilePath } from '../file-service'
import {
  enqueueWrite,
  ensureProjectExists,
  readMetadata,
  requireVaultPath,
  writeMetadata
} from './repository-context'

const MAX_EXPORTS = 1000
const MAX_IMPORT_FILES = 1000
const MAX_ZIP_SIZE = 100 * 1024 * 1024

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
  const safeProjectName = sanitizeFilenameForExport(projectName, 'project')
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
    archive.append(markdown, { name: `${safeProjectName}.md` })

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
