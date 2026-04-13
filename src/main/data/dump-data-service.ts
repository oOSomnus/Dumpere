import log from 'electron-log'
import type { CreateDumpInput, DumpEntry, UpdateDumpInput } from '@/shared/types'
import { copyFilesToVault, deleteVaultFile } from '../file-service'
import {
  enqueueWrite,
  ensureProjectExists,
  normalizeTagIds,
  readActiveMetadata,
  readMetadata,
  requireVaultPath,
  writeMetadata
} from './repository-context'

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
