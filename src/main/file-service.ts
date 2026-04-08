import { app } from 'electron'
import { copyFile, mkdir, unlink, stat } from 'fs/promises'
import { join, basename, resolve as pathResolve } from 'path'
import { randomUUID } from 'crypto'
import log from 'electron-log'
import { StoredFile } from '../renderer/lib/types'

const DUMPS_DIR = 'dumps'

export function getDumpsDir(): string {
  return join(app.getPath('userData'), DUMPS_DIR)
}

export function getMimeType(filePath: string): string {
  const ext = basename(filePath).split('.').pop()?.toLowerCase() || ''
  const mimeMap: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    // Video
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    aac: 'audio/aac',
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    md: 'text/markdown',
    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
  }
  return mimeMap[ext] || 'application/octet-stream'
}

export interface VaultStoredFile {
  id: string
  type: 'image' | 'video' | 'audio' | 'file'
  path: string  // relative path like "images/uuid.ext"
  name: string  // original filename
  mimeType: string
  size: number
}

export function getFileCategory(mimeType: string): 'image' | 'video' | 'audio' | 'file' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  return 'file'
}

export async function copyFilesToVault(
  vaultPath: string,
  tempPaths: string[]
): Promise<VaultStoredFile[]> {
  const results: VaultStoredFile[] = []

  for (const tempPath of tempPaths) {
    try {
      const id = randomUUID()
      const originalName = basename(tempPath)
      const ext = originalName.split('.').pop() || ''
      const mimeType = getMimeType(tempPath)
      const category = getFileCategory(mimeType)  // per D-02

      // Build stored filename: UUID with extension
      const storedName = ext ? `${id}.${ext}` : id

      // Build target path: vaultPath/.dumpere/{category}s/uuid.ext
      // Note: pluralize category (images/, videos/, audio/, files/) per D-09
      const targetDir = join(vaultPath, '.dumpere', `${category}s`)
      const targetPath = join(targetDir, storedName)

      // Ensure directory exists
      await mkdir(targetDir, { recursive: true })

      // Copy file (D-01: copy to vault, original stays in place)
      await copyFile(tempPath, targetPath)

      // Get file size
      const { size } = await stat(targetPath)

      // Store relative path for metadata (e.g., "images/uuid.ext")
      const relativePath = `${category}s/${storedName}`

      results.push({
        id,
        type: category,
        path: relativePath,
        name: originalName,
        mimeType,
        size
      })

      log.info(`Copied to vault: ${originalName} -> ${relativePath}`)
    } catch (err) {
      log.error(`Failed to copy file to vault: ${tempPath}`, err)
      throw err
    }
  }

  return results
}

export async function deleteVaultFile(vaultPath: string, relativePath: string): Promise<void> {
  // relativePath is like "images/uuid.ext"
  const vaultDir = join(vaultPath, '.dumpere')
  const fullPath = join(vaultDir, relativePath)

  // Ensure path stays within vault directory
  if (!fullPath.startsWith(vaultDir)) {
    throw new Error('Invalid file path: traversal detected')
  }

  try {
    await unlink(fullPath)
    log.info(`Deleted vault file: ${relativePath}`)
  } catch (err) {
    log.error(`Failed to delete vault file: ${relativePath}`, err)
    throw err
  }
}

export function getVaultFileUrl(vaultPath: string, relativePath: string): string {
  // relativePath is like "images/uuid.ext"
  const fullPath = join(vaultPath, '.dumpere', relativePath)
  return `file://${fullPath.replace(/\\/g, '/')}`
}

// Legacy exports for backward compatibility during transition
export { getMimeType }

export async function copyFiles(tempPaths: string[]): Promise<StoredFile[]> {
  const dumpsDir = getDumpsDir()
  await mkdir(dumpsDir, { recursive: true })

  const results: StoredFile[] = []

  for (const tempPath of tempPaths) {
    try {
      const id = randomUUID()
      const originalName = basename(tempPath)
      const ext = originalName.split('.').pop() || ''
      const storedName = ext ? `${id}.${ext}` : id
      const storedPath = join(dumpsDir, storedName)

      await copyFile(tempPath, storedPath)

      const { size } = await stat(storedPath)
      const mimeType = getMimeType(tempPath)

      // STOR-04: Store relative path from dumps directory root
      const relativePath = `dumps/${storedName}`

      results.push({
        id,
        originalName,
        storedPath: relativePath,
        mimeType,
        size
      })

      log.info(`Copied file: ${originalName} -> ${storedName}`)
    } catch (err) {
      log.error(`Failed to copy file: ${tempPath}`, err)
      throw err
    }
  }

  return results
}

export async function deleteFile(storedPath: string): Promise<void> {
  try {
    // Resolve relative to app data directory
    const fullPath = storedPath.startsWith('dumps/')
      ? join(app.getPath('userData'), storedPath)
      : storedPath

    await unlink(fullPath)
    log.info(`Deleted file: ${storedPath}`)
  } catch (err) {
    log.error(`Failed to delete file: ${storedPath}`, err)
    throw err
  }
}

export function getFileUrl(storedPath: string): string {
  // Return a URL that can be used in renderer to load the file
  // For local files in app data, use file:// protocol
  const fullPath = storedPath.startsWith('dumps/')
    ? join(app.getPath('userData'), storedPath)
    : storedPath
  return `file://${fullPath.replace(/\\/g, '/')}`
}
