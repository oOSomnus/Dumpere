import { readFile, writeFile, rename, unlink } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import log from 'electron-log'
import { getVaultState } from './vault-service'
import { copyFilesToVault, deleteVaultFile, VaultStoredFile } from './file-service'

export interface VaultMetadata {
  version: string
  created: string  // ISO-8601
  dumps: DumpMetadata[]
}

export interface DumpMetadata {
  id: string
  created: string  // ISO-8601
  text: string
  files: VaultFile[]
  tags: string[]
  order: number
}

export interface VaultFile {
  id: string
  type: 'image' | 'video' | 'audio' | 'file'
  path: string  // relative path like "images/uuid.ext"
  name: string  // original filename
}

// Serialized write queue - prevents concurrent write races
let writeQueue = Promise.resolve()

function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    writeQueue = writeQueue.then(async () => {
      try {
        const result = await operation()
        resolve(result)
      } catch (err) {
        reject(err)
      }
    })
  })
}

export async function readMetadata(vaultPath: string): Promise<VaultMetadata | null> {
  const metadataPath = join(vaultPath, '.dumpere', 'metadata.json')
  try {
    const content = await readFile(metadataPath, 'utf-8')
    return JSON.parse(content) as VaultMetadata
  } catch {
    log.warn(`Failed to read metadata from: ${metadataPath}`)
    return null
  }
}

export async function writeMetadata(vaultPath: string, metadata: VaultMetadata): Promise<void> {
  return enqueueWrite(async () => {
    const metadataPath = join(vaultPath, '.dumpere', 'metadata.json')
    const tempPath = `${metadataPath}.tmp`
    // Atomic write: write to temp, then rename (OS-level atomic on POSIX)
    await writeFile(tempPath, JSON.stringify(metadata, null, 2), 'utf-8')
    await rename(tempPath, metadataPath)
    log.debug(`Metadata written: ${metadata.dumps.length} dumps`)
  })
}

export interface CreateDumpInput {
  text: string
  filePaths: string[]  // Temp paths from drag-drop
}

export async function createDump(input: CreateDumpInput): Promise<DumpMetadata | null> {
  const vaultState = getVaultState()
  if (!vaultState.isOpen || !vaultState.vaultPath) {
    throw new Error('No vault open')
  }

  const vaultPath = vaultState.vaultPath
  let copiedFiles: VaultStoredFile[] = []
  let copiedPaths: string[] = []  // For rollback

  try {
    // Step 1: Copy files to vault subdirectories
    if (input.filePaths.length > 0) {
      copiedFiles = await copyFilesToVault(vaultPath, input.filePaths)
      // Track full paths for rollback
      copiedPaths = copiedFiles.map(f => join(vaultPath, '.dumpere', f.path))
    }

    // Step 2: Read current metadata
    let metadata = await readMetadata(vaultPath)
    if (!metadata) {
      // Initialize if doesn't exist
      metadata = {
        version: '1.0',
        created: new Date().toISOString(),
        dumps: []
      }
    }

    // Step 3: Create new dump entry
    const newDump: DumpMetadata = {
      id: randomUUID(),
      created: new Date().toISOString(),
      text: input.text,
      files: copiedFiles.map(f => ({
        id: f.id,
        type: f.type,
        path: f.path,  // e.g., "images/uuid.ext"
        name: f.name   // original filename
      })),
      tags: [],
      order: 0
    }

    // Step 4: Prepend to dumps array (newest first)
    metadata.dumps.unshift(newDump)

    // Step 5: Write metadata (serialized, atomic)
    await writeMetadata(vaultPath, metadata)

    log.info(`Dump created: ${newDump.id} with ${copiedFiles.length} files`)
    return newDump

  } catch (err) {
    // Rollback: delete copied files if metadata write failed (D-04)
    log.error(`Dump creation failed, rolling back ${copiedPaths.length} files:`, err)
    for (const filePath of copiedPaths) {
      try {
        await unlink(filePath)
        log.debug(`Rollback deleted: ${filePath}`)
      } catch (deleteErr) {
        log.warn(`Rollback failed for: ${filePath}`, deleteErr)
      }
    }
    throw err
  }
}
