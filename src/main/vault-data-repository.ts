import log from 'electron-log'
import { createEmptyMetadata } from './metadata-service'
import { createDump, deleteDump, getDumps, updateDump } from './data/dump-data-service'
import { exportDumps, importDumps } from './data/import-export-data-service'
import { createProject, deleteProject, getProjects, updateProject } from './data/project-data-service'
import { requireVaultPath, readMetadata, writeMetadata } from './data/repository-context'
import { exportSummary, generateSummary, getSummaries } from './data/summary-data-service'
import { createTag, deleteTag, getTags } from './data/tag-data-service'

export async function initializeVaultData(): Promise<void> {
  const vaultPath = requireVaultPath()
  try {
    await readMetadata(vaultPath)
  } catch (error) {
    log.warn('Initializing empty metadata for active vault', error)
    await writeMetadata(vaultPath, createEmptyMetadata())
  }
}

export {
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
}
