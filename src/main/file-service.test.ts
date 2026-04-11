// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import {
  copyFilesToVault,
  deleteVaultFile,
  getFileCategory,
  getMimeType,
  getVaultFileUrl,
  resolveVaultFilePath
} from './file-service'

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>()
  return {
    ...actual
  }
})

function createTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix))
}

describe('file-service', () => {
  const createdDirs: string[] = []

  afterEach(() => {
    createdDirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }))
  })

  it('returns MIME types for known extensions', () => {
    expect(getMimeType('test.jpg')).toBe('image/jpeg')
    expect(getMimeType('clip.mp4')).toBe('video/mp4')
    expect(getMimeType('voice.mp3')).toBe('audio/mpeg')
    expect(getMimeType('notes.md')).toBe('text/markdown')
    expect(getMimeType('archive.unknown')).toBe('application/octet-stream')
  })

  it('maps MIME types to attachment kinds', () => {
    expect(getFileCategory('image/png')).toBe('image')
    expect(getFileCategory('video/mp4')).toBe('video')
    expect(getFileCategory('audio/flac')).toBe('audio')
    expect(getFileCategory('application/pdf')).toBe('file')
  })

  it('copies attachments into vault-only storage and returns attachment records', async () => {
    const vaultPath = createTempDir('dumpere-vault-files-')
    const sourceDir = createTempDir('dumpere-source-files-')
    createdDirs.push(vaultPath, sourceDir)

    const sourcePath = join(sourceDir, 'diagram.png')
    writeFileSync(sourcePath, 'fake-image-content')

    const [attachment] = await copyFilesToVault(vaultPath, [sourcePath])

    expect(attachment.originalName).toBe('diagram.png')
    expect(attachment.kind).toBe('image')
    expect(attachment.mimeType).toBe('image/png')
    expect(attachment.size).toBeGreaterThan(0)
    expect(attachment.storedPath).toMatch(/^images\/[0-9a-f-]+\.png$/)
    expect(basename(resolveVaultFilePath(vaultPath, attachment.storedPath))).toMatch(/\.png$/)
    expect(existsSync(resolveVaultFilePath(vaultPath, attachment.storedPath))).toBe(true)
  })

  it('prevents path traversal when resolving vault files', async () => {
    const vaultPath = createTempDir('dumpere-vault-paths-')
    createdDirs.push(vaultPath)

    expect(() => resolveVaultFilePath(vaultPath, '../secrets.txt')).toThrow('traversal')
    expect(() => resolveVaultFilePath(vaultPath, '/etc/passwd')).toThrow('traversal')
  })

  it('deletes stored vault files', async () => {
    const vaultPath = createTempDir('dumpere-vault-delete-')
    createdDirs.push(vaultPath)

    const storedPath = 'files/spec.pdf'
    const fullPath = join(vaultPath, '.dumpere', storedPath)
    mkdirSync(join(vaultPath, '.dumpere', 'files'), { recursive: true })
    writeFileSync(fullPath, 'pdf-content')

    await deleteVaultFile(vaultPath, storedPath)

    expect(existsSync(fullPath)).toBe(false)
  })

  it('returns a file URL for vault attachments', async () => {
    const vaultPath = createTempDir('dumpere-vault-url-')
    createdDirs.push(vaultPath)

    const url = getVaultFileUrl(vaultPath, 'images/test.jpg')
    expect(url).toBe(`file://${join(vaultPath, '.dumpere', 'images', 'test.jpg').replace(/\\/g, '/')}`)
  })
})
