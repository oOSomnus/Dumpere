import { app } from 'electron'
import { copyFile, mkdir, unlink, stat } from 'fs/promises'
import { join, basename } from 'path'
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
