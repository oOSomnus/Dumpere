import { ipcMain, BrowserWindow, dialog, app, clipboard } from 'electron'
import log from 'electron-log'
import { store } from './store'
import { copyFiles, deleteFile, getFileUrl, getDumpsDir } from './file-service'
import { createVault, openVault, getVaultState, onVaultStateChange, VaultState, RecentVault } from './vault-service'
import { createDump, readMetadata, VaultMetadata, DumpMetadata } from './metadata-service'
import { DumpEntry, StoredFile, Project, Tag, SummaryEntry, SummarySettings, ProjectWorkpad } from '../renderer/lib/types'
import archiver from 'archiver'
import { createWriteStream } from 'fs'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import AdmZip from 'adm-zip'

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
}

function sanitizeAttachmentName(name: string, mimeType: string): string {
  const trimmed = name.trim()
  if (trimmed) {
    return trimmed
      .split(/[\\/]/)
      .pop()
      ?.replace(/[^\w.-]+/g, '-') || 'attachment'
  }

  const ext = MIME_EXTENSION_MAP[mimeType] || 'bin'
  const prefix = mimeType.startsWith('image/') ? 'pasted-image' : 'pasted-file'
  return `${prefix}.${ext}`
}

function ensureDumpIds(dumps: DumpEntry[]): DumpEntry[] {
  let didChange = false

  const normalized = dumps.map((dump) => {
    if (dump.id) {
      return dump
    }

    didChange = true
    return {
      ...dump,
      id: crypto.randomUUID()
    }
  })

  if (didChange) {
    store.set('dumps', normalized)
    log.warn('Normalized dumps with missing ids in store')
  }

  return normalized
}

function getStoredWorkpad(projectId: string | null): ProjectWorkpad {
  const workpads = store.get('workpads', [])
  return workpads.find(workpad => workpad.projectId === projectId) || {
    projectId,
    content: '',
    updatedAt: 0
  }
}

function updateStoredWorkpad(projectId: string | null, content: string): ProjectWorkpad {
  const workpads = store.get('workpads', [])
  const nextWorkpad: ProjectWorkpad = {
    projectId,
    content,
    updatedAt: Date.now()
  }
  const existingIndex = workpads.findIndex(workpad => workpad.projectId === projectId)

  if (existingIndex === -1) {
    workpads.push(nextWorkpad)
  } else {
    workpads.splice(existingIndex, 1, nextWorkpad)
  }

  store.set('workpads', workpads)
  return nextWorkpad
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

export function setupIPCHandlers(): void {
  log.info('Setting up IPC handlers')

  // file:copy — copy files to dumps directory
  ipcMain.handle('file:copy', async (_, tempPaths: string[]): Promise<StoredFile[]> => {
    log.debug(`file:copy called with ${tempPaths.length} files`)
    return copyFiles(tempPaths)
  })

  // file:delete — delete stored file
  ipcMain.handle('file:delete', async (_, storedPath: string): Promise<void> => {
    log.debug(`file:delete called for: ${storedPath}`)
    await deleteFile(storedPath)
  })

  // file:get-url — get file URL for renderer
  ipcMain.handle('file:get-url', (_, storedPath: string): string => {
    return getFileUrl(storedPath)
  })

  // store:get-dumps — retrieve all dumps sorted by createdAt desc
  ipcMain.handle('store:get-dumps', (): DumpEntry[] => {
    const dumps = ensureDumpIds(store.get('dumps', []))
    return dumps.sort((a, b) => b.createdAt - a.createdAt)
  })

  // store:save-dump — add new dump entry
  ipcMain.handle('store:save-dump', (_, dump: Omit<DumpEntry, 'id'>): DumpEntry => {
    if (!dump.projectId) {
      throw new Error('Project assignment is required before saving a dump')
    }

    const dumps = ensureDumpIds(store.get('dumps', []))
    const savedDump: DumpEntry = {
      ...dump,
      id: crypto.randomUUID()
    }

    dumps.unshift(savedDump)
    store.set('dumps', dumps)
    log.info(`Saved dump: ${savedDump.id}`)
    return savedDump
  })

  // store:delete-dump — remove dump entry
  ipcMain.handle('store:delete-dump', async (_, id: string): Promise<void> => {
    const dumps = ensureDumpIds(store.get('dumps', []))
    const dump = dumps.find(d => d.id === id)
    if (dump) {
      // Delete associated files
      for (const file of dump.files) {
        try {
          await deleteFile(file.storedPath)
        } catch (err) {
          log.warn(`Failed to delete file: ${file.storedPath}`, err)
        }
      }
      const filtered = dumps.filter(d => d.id !== id)
      store.set('dumps', filtered)
      log.info(`Deleted dump: ${id}`)
    }
  })

  // store:get-projects — retrieve all projects
  ipcMain.handle('store:get-projects', (): Project[] => {
    return store.get('projects', [])
  })

  // store:save-project — add new project
  ipcMain.handle('store:save-project', (_, project: Project): Project => {
    const projects = store.get('projects', [])
    projects.push(project)
    store.set('projects', projects)
    log.info(`Saved project: ${project.id}`)
    return project
  })

  // store:update-project — rename project
  ipcMain.handle('store:update-project', (_, id: string, name: string): Project | undefined => {
    const projects = store.get('projects', [])
    const project = projects.find(p => p.id === id)
    if (project) {
      project.name = name
      store.set('projects', projects)
      log.info(`Updated project: ${id}`)
    }
    return project
  })

  // store:delete-project — remove project
  ipcMain.handle('store:delete-project', (_, id: string): void => {
    const projects = store.get('projects', [])
    store.set('projects', projects.filter(p => p.id !== id))
    // Move dumps with this projectId to null (unassigned)
    const dumps = store.get('dumps', [])
    dumps.forEach(d => {
      if (d.projectId === id) d.projectId = null
    })
    store.set('dumps', dumps)
    const workpads = store.get('workpads', [])
    store.set('workpads', workpads.filter(workpad => workpad.projectId !== id))
    log.info(`Deleted project: ${id}`)
  })

  // store:get-tags — retrieve all tags
  ipcMain.handle('store:get-tags', (): Tag[] => {
    return store.get('tags', [])
  })

  // store:save-tag — add new tag
  ipcMain.handle('store:save-tag', (_, tag: Tag): Tag => {
    const tags = store.get('tags', [])
    tags.push(tag)
    store.set('tags', tags)
    log.info(`Saved tag: ${tag.id}`)
    return tag
  })

  // store:delete-tag — remove tag
  ipcMain.handle('store:delete-tag', (_, id: string): void => {
    const tags = store.get('tags', [])
    store.set('tags', tags.filter(t => t.id !== id))
    // Remove tag from all dumps
    const dumps = store.get('dumps', [])
    dumps.forEach(d => {
      d.tags = d.tags.filter(tagId => tagId !== id)
    })
    store.set('dumps', dumps)
    log.info(`Deleted tag: ${id}`)
  })

  // store:get-dump-order — get user-defined dump order
  ipcMain.handle('store:get-dump-order', (): string[] => {
    return store.get('dumpOrder', [])
  })

  // store:set-dump-order — save user-defined dump order
  ipcMain.handle('store:set-dump-order', (_, ids: string[]): void => {
    store.set('dumpOrder', ids)
    log.info(`Saved dump order: ${ids.length} items`)
  })

  // store:update-dump — update dump projectId and/or tags
  ipcMain.handle('store:update-dump', (_, id: string, updates: { projectId?: string | null; tags?: string[] }): DumpEntry | null => {
    const dumps = ensureDumpIds(store.get('dumps', []))
    const dump = dumps.find(d => d.id === id)
    if (dump) {
      if (updates.projectId !== undefined) {
        dump.projectId = updates.projectId
      }
      if (updates.tags !== undefined) {
        dump.tags = updates.tags
      }
      dump.updatedAt = Date.now()
      store.set('dumps', dumps)
      log.info(`Updated dump: ${id}`)
      return dump
    }
    return null
  })

  // window:get-bounds — get saved window bounds
  ipcMain.handle('window:get-bounds', () => {
    return store.get('windowBounds', null)
  })

  // window:set-bounds — save window bounds
  ipcMain.handle('window:set-bounds', (_, bounds) => {
    store.set('windowBounds', bounds)
  })

  // window:is-maximized — check if window is maximized
  ipcMain.handle('window:is-maximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return win?.isMaximized() ?? false
  })

  // export:save-dialog — open native save dialog for ZIP export
  ipcMain.handle('export:save-dialog', async (_, defaultName: string): Promise<string | null> => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
    })
    return result.canceled ? null : result.filePath
  })

  // export:dumps — create ZIP with markdown file and assets folder
  ipcMain.handle('export:dumps', async (_, dumpIds: string[], projectName: string, outputPath?: string): Promise<string | null> => {
    const MAX_EXPORTS = 1000

    if (dumpIds.length > MAX_EXPORTS) {
      log.warn(`Export limited to ${MAX_EXPORTS} dumps, got ${dumpIds.length}`)
      dumpIds = dumpIds.slice(0, MAX_EXPORTS)
    }

    const dumps = store.get('dumps', [])
    const selectedDumps = dumps.filter(d => dumpIds.includes(d.id))

    if (selectedDumps.length === 0) {
      log.warn('No dumps found for export')
      return null
    }

    // Sort by createdAt ascending for chronological order in export
    selectedDumps.sort((a, b) => a.createdAt - b.createdAt)

    // Build markdown content per D-07 format
    const dateMap = new Map<string, DumpEntry[]>()
    for (const dump of selectedDumps) {
      const date = new Date(dump.createdAt).toISOString().split('T')[0]
      if (!dateMap.has(date)) {
        dateMap.set(date, [])
      }
      dateMap.get(date)!.push(dump)
    }

    const lines: string[] = []
    lines.push(`# ${projectName}`)
    lines.push('')

    for (const [date, dateDumps] of dateMap) {
      lines.push(`## ${date}`)
      lines.push('')
      for (const dump of dateDumps) {
        const time = new Date(dump.createdAt).toTimeString().split(' ')[0].substring(0, 5)
        lines.push(`### ${time}`)
        lines.push('')
        if (dump.text) {
          lines.push(dump.text)
          lines.push('')
        }
        for (const file of dump.files) {
          lines.push(`![${file.originalName}](./assets/${file.originalName})`)
          lines.push('')
        }
      }
    }

    const markdown = lines.join('\n')

    // Show save dialog to get output path (skip if already provided)
    let savePath = outputPath
    if (!savePath) {
      const saveResult = await dialog.showSaveDialog({
        defaultPath: `${projectName}.zip`,
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
      })
      if (saveResult.canceled || !saveResult.filePath) {
        return null
      }
      savePath = saveResult.filePath
    }

    // Create ZIP archive
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(savePath)
      const archive = archiver('zip', { zlib: { level: 9 } })

      output.on('close', () => {
        log.info(`Export ZIP created: ${savePath} (${archive.pointer()} bytes)`)
        resolve()
      })

      archive.on('error', (err) => {
        log.error('Export ZIP error', err)
        reject(err)
      })

      archive.pipe(output)

      // Add markdown file
      archive.append(markdown, { name: `${projectName}.md` })

      // Add assets folder with all referenced files
      const dumpsDir = getDumpsDir()
      for (const dump of selectedDumps) {
        for (const file of dump.files) {
          const filePath = join(dumpsDir, file.storedPath.replace('dumps/', ''))
          archive.file(filePath, { name: `assets/${file.originalName}` })
        }
      }

      archive.finalize()
    })

    return savePath
  })

  // import:dialog — open native file picker for ZIP selection
  ipcMain.handle('import:dialog', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
      properties: ['openFile']
    })
    return result.canceled ? null : result.filePaths[0] ?? null
  })

  // import:dumps — parse ZIP and create dump entries
  ipcMain.handle('import:dumps', async (_, zipPath: string, projectId: string): Promise<number> => {
    const MAX_IMPORT_FILES = 1000
    const MAX_ZIP_SIZE = 100 * 1024 * 1024 // 100MB

    try {
      const zip = new AdmZip(zipPath)

      // Check ZIP size
      const zipEntries = zip.getEntries()
      let totalSize = 0
      for (const entry of zipEntries) {
        totalSize += entry.header.size
      }
      if (totalSize > MAX_ZIP_SIZE) {
        log.warn(`Import ZIP too large: ${totalSize} bytes`)
        throw new Error('ZIP file is too large (max 100MB)')
      }

      // Find markdown file in ZIP root
      const mdEntry = zipEntries.find(e => e.entryName.endsWith('.md') && !e.entryName.includes('/'))
      if (!mdEntry) {
        log.warn('No markdown file found in ZIP root')
        throw new Error('Invalid ZIP: no markdown file found')
      }

      const markdown = mdEntry.getData().toString('utf8')
      const projectName = markdown.split('\n')[0]?.replace(/^#\s*/, '').trim() || 'Imported'

      // Parse markdown per D-07 format
      // Structure: # Project Name, ## YYYY-MM-DD, ### HH:mm, content...
      const dumps: Array<{ text: string; files: StoredFile[]; createdAt: number }> = []

      // Split by date sections (## YYYY-MM-DD)
      const dateSections = markdown.split(/(?=^## )/m).filter(s => s.trim())

      for (const section of dateSections) {
        const lines = section.split('\n')
        const dateMatch = lines[0]?.match(/^## (\d{4}-\d{2}-\d{2})/)
        if (!dateMatch) continue
        const date = dateMatch[1]

        // Split by time sections (### HH:mm)
        const timeSections = section.split(/(?=^### )/m).filter(s => s.trim())

        for (const timeSection of timeSections) {
          const timeLines = timeSection.split('\n')
          const timeMatch = timeLines[0]?.match(/^### (\d{2}:\d{2})/)
          if (!timeMatch) continue
          const time = timeMatch[1]

          // Content is everything after the time header until the next ### or ## or end
          const contentLines: string[] = []
          const fileRefs: string[] = []
          let inContent = false

          for (const line of timeLines.slice(1)) {
            if (line.startsWith('## ') || line.startsWith('### ')) break
            if (line.startsWith('![')) {
              // Extract filename from ![name](./assets/filename)
              const refMatch = line.match(/!\[([^\]]*)\]\(\.\/assets\/([^)]+)\)/)
              if (refMatch) {
                fileRefs.push(refMatch[2])
                contentLines.push(line)
              }
            } else {
              contentLines.push(line)
              inContent = true
            }
          }

          const text = contentLines.filter(l => !l.startsWith('![')).join('\n').trim()

          // Create timestamp
          const timestamp = new Date(`${date}T${time}:00`).getTime() || Date.now()

          dumps.push({
            text,
            files: [],
            createdAt: timestamp
          })

          // Extract assets if referenced
          if (fileRefs.length > 0) {
            const assetsDir = zipEntries.find(e => e.entryName === 'assets/')
            if (assetsDir) {
              const lastDump = dumps[dumps.length - 1]
              for (const fileRef of fileRefs) {
                const assetEntry = zipEntries.find(e => e.entryName === `assets/${fileRef}`)
                if (assetEntry && !assetEntry.isDirectory) {
                  // T-03-06: Validate path doesn't escape assets folder
                  if (assetEntry.entryName.includes('..')) {
                    log.warn(`Path traversal attempt detected: ${assetEntry.entryName}`)
                    continue
                  }

                  // Copy file to dumps directory
                  const tempPath = join(app.getPath('temp'), `import-${Date.now()}-${fileRef}`)
                  zip.extractEntryTo(assetEntry.entryName, app.getPath('temp'), true, true, tempPath)

                  try {
                    const storedFiles = await copyFiles([tempPath])
                    lastDump.files.push(...storedFiles)
                  } finally {
                    // Clean up temp file
                    import('fs/promises').then(fs => fs.unlink(tempPath).catch(() => {}))
                  }
                }
              }
            }
          }
        }
      }

      // Limit dumps
      if (dumps.length > MAX_IMPORT_FILES) {
        log.warn(`Import limited to ${MAX_IMPORT_FILES} dumps, got ${dumps.length}`)
        dumps.splice(MAX_IMPORT_FILES)
      }

      // Create dump entries in store
      const allDumps = store.get('dumps', [])
      for (const dumpData of dumps) {
        const dump: DumpEntry = {
          id: crypto.randomUUID(),
          text: dumpData.text,
          files: dumpData.files,
          createdAt: dumpData.createdAt,
          updatedAt: Date.now(),
          projectId,
          tags: []
        }
        allDumps.unshift(dump)
      }
      store.set('dumps', allDumps)

      log.info(`Imported ${dumps.length} dumps to project ${projectId}`)
      return dumps.length

    } catch (err) {
      log.error('Import failed', err)
      throw err
    }
  })

  // clipboard:write — write text to system clipboard
  ipcMain.handle('clipboard:write', async (_, text: string) => {
    clipboard.writeText(text)
  })

  // attachment:create-temp — persist pasted binary data so it can reuse the normal file pipeline
  ipcMain.handle('attachment:create-temp', async (_, input: { name: string; mimeType: string; data: ArrayBuffer }): Promise<string> => {
    const fileName = sanitizeAttachmentName(input.name, input.mimeType)
    const tempPath = join(app.getPath('temp'), `dumpere-${crypto.randomUUID()}-${fileName}`)
    await writeFile(tempPath, Buffer.from(new Uint8Array(input.data)))
    return tempPath
  })

  // summary:get-settings — retrieve persisted summary provider settings
  ipcMain.handle('summary:get-settings', async (): Promise<SummarySettings> => {
    const { getDefaultSummarySettings, sanitizeSummarySettings } = await import('./ai-service')
    const settings = store.get('summarySettings', getDefaultSummarySettings())
    return sanitizeSummarySettings(settings)
  })

  // summary:update-settings — store summary provider settings
  ipcMain.handle('summary:update-settings', async (_, settings: SummarySettings): Promise<SummarySettings> => {
    const { sanitizeSummarySettings } = await import('./ai-service')
    const sanitized = sanitizeSummarySettings(settings)
    store.set('summarySettings', sanitized)
    log.info(`Updated summary settings for provider: ${sanitized.provider}`)
    return sanitized
  })

  // workpad:get — retrieve the persisted markdown workpad for a project
  ipcMain.handle('workpad:get', async (_, projectId: string | null): Promise<ProjectWorkpad> => {
    return getStoredWorkpad(projectId)
  })

  // workpad:update — persist markdown workpad content
  ipcMain.handle('workpad:update', async (_, projectId: string | null, content: string): Promise<ProjectWorkpad> => {
    return updateStoredWorkpad(projectId, content)
  })

  // summary:check-health — check whether the configured summary provider is reachable
  ipcMain.handle('summary:check-health', async (): Promise<boolean> => {
    const { getDefaultSummarySettings, sanitizeSummarySettings, checkSummaryHealth } = await import('./ai-service')
    const settings = sanitizeSummarySettings(store.get('summarySettings', getDefaultSummarySettings()))
    return checkSummaryHealth(settings)
  })

  // ai:generate-summary — generate a daily or weekly summary
  ipcMain.handle('ai:generate-summary', async (_, options: { type: 'daily' | 'weekly'; projectId: string | null }): Promise<SummaryEntry | null> => {
    const { type, projectId } = options
    log.info(`Generating ${type} summary for project: ${projectId ?? 'all'}`)

    const {
      getDefaultSummarySettings,
      sanitizeSummarySettings,
      checkSummaryHealth,
      generateSummary,
      buildSummaryPrompt
    } = await import('./ai-service')

    const settings = sanitizeSummarySettings(store.get('summarySettings', getDefaultSummarySettings()))
    const isHealthy = await checkSummaryHealth(settings)
    if (!isHealthy) {
      const providerLabel = settings.provider === 'openai' ? 'OpenAI' : 'Ollama'
      log.warn(`${providerLabel} is unavailable`)
      throw new Error(`${providerLabel} is unavailable. Check your summary settings and connection.`)
    }

    // Get dumps from store
    let dumps = store.get('dumps', [])

    // Filter by project if specified
    if (projectId) {
      dumps = dumps.filter(d => d.projectId === projectId)
    }

    // Filter by time range
    const now = Date.now()
    const rangeStart = type === 'daily'
      ? new Date().setHours(0, 0, 0, 0)
      : new Date().setDate(new Date().getDate() - 7)

    dumps = dumps.filter(d => d.createdAt >= rangeStart && d.createdAt <= now)

    if (dumps.length === 0) {
      log.info('No dumps to summarize')
      return null
    }

    // Build prompt and generate summary
    const workpad = getStoredWorkpad(projectId)
    const prompt = buildSummaryPrompt({ type, projectId, dumps, workpadContent: workpad.content })
    const content = await generateSummary(prompt, settings)

    // Create summary entry
    const entry: SummaryEntry = {
      id: crypto.randomUUID(),
      type,
      projectId,
      generatedAt: Date.now(),
      content,
      dumpCount: dumps.length
    }

    // Store it
    const summaries = store.get('summaries', [])
    summaries.unshift(entry)
    store.set('summaries', summaries)
    const latestWorkpad = getStoredWorkpad(projectId)
    updateStoredWorkpad(projectId, appendMarkdownSection(latestWorkpad.content, buildSummaryWorkpadSection(entry)))

    log.info(`Summary generated: ${entry.id}, ${dumps.length} dumps summarized`)
    return entry
  })

  // ai:get-summaries — retrieve stored summaries
  ipcMain.handle('ai:get-summaries', (_, filters?: { type?: 'daily' | 'weekly'; projectId?: string | null }): SummaryEntry[] => {
    let summaries = store.get('summaries', [])

    if (filters?.type) {
      summaries = summaries.filter(s => s.type === filters.type)
    }
    if (filters?.projectId !== undefined) {
      summaries = summaries.filter(s => s.projectId === filters.projectId)
    }

    return summaries
  })

  // ai:export-summary — save summary as markdown file
  ipcMain.handle('ai:export-summary', async (_, summaryId: string): Promise<string | null> => {
    const summaries = store.get('summaries', [])
    const summary = summaries.find(s => s.id === summaryId)

    if (!summary) {
      log.warn(`Summary not found: ${summaryId}`)
      return null
    }

    // Get project name for filename
    let projectName = 'all-projects'
    if (summary.projectId) {
      const projects = store.get('projects', [])
      const project = projects.find(p => p.id === summary.projectId)
      projectName = project?.name?.toLowerCase().replace(/\s+/g, '-') ?? 'project'
    }

    // Build default filename
    const date = new Date(summary.generatedAt).toISOString().split('T')[0]
    const defaultName = `summary-${projectName}-${summary.type}-${date}.md`

    // Show save dialog
    const { dialog } = await import('electron')
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })

    if (result.canceled || !result.filePath) {
      return null
    }

    // Write file
    const { writeFile } = await import('fs/promises')
    await writeFile(result.filePath, summary.content, 'utf8')
    log.info(`Summary exported: ${result.filePath}`)

    return result.filePath
  })

  // vault:get-state — get current vault state
  ipcMain.handle('vault:get-state', (): VaultState => {
    return getVaultState()
  })

  // vault:create — create a new vault
  ipcMain.handle('vault:create', async (): Promise<VaultState> => {
    log.info('IPC: vault:create')
    return await createVault()
  })

  // vault:open — open an existing vault
  ipcMain.handle('vault:open', async (_, vaultPath?: string): Promise<VaultState> => {
    log.info('IPC: vault:open')
    return await openVault(vaultPath)
  })

  // vault:close — close current vault (permitted operation per D-01)
  ipcMain.handle('vault:close', async (): Promise<VaultState> => {
    log.info('IPC: vault:close')
    const { BrowserWindow } = await import('electron')
    // Reset vault state
    const vaultState: VaultState = { isOpen: false, vaultPath: null, vaultName: null }
    // Notify all windows
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('vault:state-changed', vaultState)
    })
    return vaultState
  })

  // vault:get-recent — get list of recent vaults
  ipcMain.handle('vault:get-recent', (): RecentVault[] => {
    return store.get('recentVaults', [])
  })

  // dump:create — create a new dump with files (per FILE-01, META-01, META-02)
  ipcMain.handle('dump:create', async (_, input: { text: string; filePaths: string[] }): Promise<DumpMetadata | null> => {
    log.info(`IPC: dump:create — text length: ${input.text.length}, files: ${input.filePaths.length}`)
    try {
      const result = await createDump(input)
      log.info(`dump:create success: ${result?.id}`)
      return result
    } catch (err) {
      log.error('dump:create failed:', err)
      throw err
    }
  })

  // dump:get — retrieve all dumps from vault metadata (per META-01)
  ipcMain.handle('dump:get', async (): Promise<DumpMetadata[]> => {
    const vaultState = getVaultState()
    if (!vaultState.isOpen || !vaultState.vaultPath) {
      return []  // No vault open = no dumps
    }
    const metadata = await readMetadata(vaultState.vaultPath)
    return metadata?.dumps ?? []
  })

  // Forward vault state changes to all windows
  onVaultStateChange((state: VaultState) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('vault:state-changed', state)
    })
  })

  log.info('IPC handlers registered')
}
