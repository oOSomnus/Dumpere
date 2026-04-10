import { readFile, writeFile, rename, unlink } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import log from 'electron-log'
import { getVaultState } from './vault-service'
import { copyFilesToVault, VaultStoredFile } from './file-service'

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
  mimeType: string
  size: number
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
        // Reset queue to resolved so future writes can proceed
        writeQueue = Promise.resolve()
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

  // Wrap entire read-modify-write in enqueueWrite to prevent race conditions
  // Per META-02: "Use a write queue that serializes all writes through a single async function"
  // This ensures no two createDump calls can read-modify-write concurrently
  return enqueueWrite(async () => {
    let copiedFiles: VaultStoredFile[] = []
    let copiedPaths: string[] = []  // For rollback

    try {
      // Step 1: Copy files to vault subdirectories (outside queue - file I/O parallel)
      if (input.filePaths.length > 0) {
        copiedFiles = await copyFilesToVault(vaultPath, input.filePaths)
        // Track full paths for rollback
        copiedPaths = copiedFiles.map(f => join(vaultPath, '.dumpere', f.path))
      }

      // Step 2: Read current metadata (inside queue - serialized)
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
          name: f.name,  // original filename
          mimeType: f.mimeType,
          size: f.size
        })),
        tags: [],
        order: 0
      }

      // Step 4: Prepend to dumps array (newest first)
      metadata.dumps.unshift(newDump)

      // Step 5: Write metadata (inside queue - serialized)
      // Note: writeMetadata does NOT use enqueueWrite internally when called from here
      // because we're already inside an enqueued operation. It just does the atomic write.
      const metadataPath = join(vaultPath, '.dumpere', 'metadata.json')
      const tempPath = `${metadataPath}.tmp`
      await writeFile(tempPath, JSON.stringify(metadata, null, 2), 'utf-8')
      await rename(tempPath, metadataPath)

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
  })
}
