import { dialog, ipcMain } from 'electron'
import {
  createDump,
  createProject,
  createTag,
  deleteDump,
  deleteProject,
  deleteTag,
  exportDumps,
  exportSummary,
  generateSummary,
  getDumps,
  getProjects,
  getSummaries,
  getTags,
  importDumps,
  updateDump,
  updateProject
} from '../vault-data-repository'
import { getDefaultSummarySettings, sanitizeSummarySettings } from '../ai-service'
import { store } from '../store'
import { sanitizeFilenameForExport } from '@/shared/naming'

export function registerDataIPC(): void {
  ipcMain.handle('data:get-dumps', () => getDumps())
  ipcMain.handle('data:create-dump', (_, input) => createDump(input))
  ipcMain.handle('data:update-dump', (_, id: string, updates) => updateDump(id, updates))
  ipcMain.handle('data:delete-dump', (_, id: string) => deleteDump(id))

  ipcMain.handle('data:get-projects', () => getProjects())
  ipcMain.handle('data:create-project', (_, name: string) => createProject(name))
  ipcMain.handle('data:update-project', (_, id: string, name: string) => updateProject(id, name))
  ipcMain.handle('data:delete-project', (_, id: string) => deleteProject(id))

  ipcMain.handle('data:get-tags', () => getTags())
  ipcMain.handle('data:create-tag', (_, name: string) => createTag(name))
  ipcMain.handle('data:delete-tag', (_, id: string) => deleteTag(id))

  ipcMain.handle('data:get-summaries', (_, filters) => getSummaries(filters))
  ipcMain.handle('data:generate-summary', async (_, options) => {
    const settings = sanitizeSummarySettings(store.get('summarySettings', getDefaultSummarySettings()))
    return generateSummary(options, settings)
  })
  ipcMain.handle('data:export-summary', async (_, summaryId: string) => {
    const summaries = await getSummaries()
    const summary = summaries.find((entry) => entry.id === summaryId)
    if (!summary) {
      return null
    }

    const projects = await getProjects()
    const projectName = summary.projectId
      ? sanitizeFilenameForExport(projects.find((project) => project.id === summary.projectId)?.name ?? '', 'project')
      : 'all-projects'
    const date = new Date(summary.generatedAt).toISOString().split('T')[0]
    const defaultName = `summary-${projectName}-${summary.type}-${date}.md`

    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })

    if (result.canceled || !result.filePath) {
      return null
    }

    return exportSummary(summaryId, result.filePath)
  })
  ipcMain.handle('data:export-dumps', async (_, dumpIds: string[], projectName: string, outputPath?: string) => {
    let nextOutputPath = outputPath
    if (!nextOutputPath) {
      const result = await dialog.showSaveDialog({
        defaultPath: `${sanitizeFilenameForExport(projectName, 'project')}.zip`,
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
      })
      if (result.canceled || !result.filePath) {
        return null
      }
      nextOutputPath = result.filePath
    }

    return exportDumps(dumpIds, projectName, nextOutputPath)
  })
  ipcMain.handle('data:import-dumps', (_, zipPath: string, projectId: string) => importDumps(zipPath, projectId))
}
