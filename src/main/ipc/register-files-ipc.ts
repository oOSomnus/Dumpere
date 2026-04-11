import { app, ipcMain, shell } from 'electron'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { getVaultFileUrl, resolveVaultFilePath } from '../file-service'
import { getVaultState } from '../vault-service'

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'text/plain': 'txt'
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

function requireVaultPath(): string {
  const state = getVaultState()
  if (!state.isOpen || !state.vaultPath) {
    throw new Error('No vault open')
  }

  return state.vaultPath
}

export function registerFilesIPC(): void {
  ipcMain.handle('files:open', async (_, storedPath: string) => {
    const error = await shell.openPath(resolveVaultFilePath(requireVaultPath(), storedPath))
    if (error) {
      throw new Error(error)
    }
  })

  ipcMain.handle('files:get-url', (_, storedPath: string) => {
    return getVaultFileUrl(requireVaultPath(), storedPath)
  })

  ipcMain.handle('files:create-temp', async (_, input: { name: string; mimeType: string; data: ArrayBuffer }) => {
    const fileName = sanitizeAttachmentName(input.name, input.mimeType)
    const tempPath = join(app.getPath('temp'), `dumpere-${crypto.randomUUID()}-${fileName}`)
    await writeFile(tempPath, Buffer.from(new Uint8Array(input.data)))
    return tempPath
  })
}
