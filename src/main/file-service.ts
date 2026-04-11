import { copyFile, mkdir, stat, unlink, writeFile } from 'fs/promises'
import { basename, join, resolve as resolvePath, sep } from 'path'
import { randomUUID } from 'crypto'
import log from 'electron-log'
import type { AttachmentKind, AttachmentRecord } from '@/shared/types'

const ATTACHMENTS_ROOT = '.dumpere'

export function getMimeType(filePath: string): string {
  const ext = basename(filePath).split('.').pop()?.toLowerCase() || ''
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    aac: 'audio/aac',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    md: 'text/markdown',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip'
  }

  return mimeMap[ext] || 'application/octet-stream'
}

export function getFileCategory(mimeType: string): AttachmentKind {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  return 'file'
}

function getAttachmentDirectory(vaultPath: string, kind: AttachmentKind): string {
  return join(vaultPath, ATTACHMENTS_ROOT, `${kind}s`)
}

export function resolveVaultFilePath(vaultPath: string, storedPath: string): string {
  const root = resolvePath(vaultPath, ATTACHMENTS_ROOT)
  const fullPath = resolvePath(root, storedPath)

  if (fullPath !== root && !fullPath.startsWith(`${root}${sep}`)) {
    throw new Error('Invalid file path: traversal detected')
  }

  return fullPath
}

export async function copyFilesToVault(vaultPath: string, tempPaths: string[]): Promise<AttachmentRecord[]> {
  const results: AttachmentRecord[] = []

  for (const tempPath of tempPaths) {
    const id = randomUUID()
    const originalName = basename(tempPath)
    const ext = originalName.split('.').pop() || ''
    const mimeType = getMimeType(tempPath)
    const kind = getFileCategory(mimeType)
    const storedName = ext ? `${id}.${ext}` : id
    const targetDir = getAttachmentDirectory(vaultPath, kind)
    const targetPath = join(targetDir, storedName)

    await mkdir(targetDir, { recursive: true })
    await copyFile(tempPath, targetPath)

    const { size } = await stat(targetPath)
    const storedPath = `${kind}s/${storedName}`

    results.push({
      id,
      originalName,
      storedPath,
      mimeType,
      size,
      kind
    })

    log.info(`Copied attachment: ${originalName} -> ${storedPath}`)
  }

  return results
}

export async function createAttachmentFromBuffer(
  vaultPath: string,
  input: { name: string; mimeType: string; data: Buffer }
): Promise<AttachmentRecord> {
  const id = randomUUID()
  const ext = input.name.split('.').pop() || ''
  const kind = getFileCategory(input.mimeType)
  const storedName = ext ? `${id}.${ext}` : id
  const targetDir = getAttachmentDirectory(vaultPath, kind)
  const targetPath = join(targetDir, storedName)

  await mkdir(targetDir, { recursive: true })
  await writeFile(targetPath, input.data)

  const { size } = await stat(targetPath)
  const storedPath = `${kind}s/${storedName}`

  return {
    id,
    originalName: input.name,
    storedPath,
    mimeType: input.mimeType,
    size,
    kind
  }
}

export async function deleteVaultFile(vaultPath: string, storedPath: string): Promise<void> {
  await unlink(resolveVaultFilePath(vaultPath, storedPath))
}

export function getVaultFileUrl(vaultPath: string, storedPath: string): string {
  const fullPath = resolveVaultFilePath(vaultPath, storedPath)
  return `file://${fullPath.replace(/\\/g, '/')}`
}
