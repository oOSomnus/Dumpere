// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import * as fsPromises from 'fs/promises'
import {
  getMimeType,
  getFileCategory,
  copyFilesToVault,
  deleteVaultFile,
  getVaultFileUrl
} from './file-service'

// Mock electron-log
vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

// Mock fs/promises
vi.mock('fs/promises', () => ({
  copyFile: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
  stat: vi.fn(),
}))

// Mock app.getPath
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-userData'),
  },
}))

describe('file-service', () => {
  describe('getMimeType', () => {
    it('returns correct MIME types for images', () => {
      expect(getMimeType('test.jpg')).toBe('image/jpeg')
      expect(getMimeType('test.png')).toBe('image/png')
      expect(getMimeType('test.gif')).toBe('image/gif')
      expect(getMimeType('test.webp')).toBe('image/webp')
    })

    it('returns correct MIME types for videos', () => {
      expect(getMimeType('test.mp4')).toBe('video/mp4')
      expect(getMimeType('test.webm')).toBe('video/webm')
      expect(getMimeType('test.mov')).toBe('video/quicktime')
    })

    it('returns correct MIME types for audio', () => {
      expect(getMimeType('test.mp3')).toBe('audio/mpeg')
      expect(getMimeType('test.wav')).toBe('audio/wav')
      expect(getMimeType('test.flac')).toBe('audio/flac')
    })

    it('returns correct MIME types for documents', () => {
      expect(getMimeType('test.pdf')).toBe('application/pdf')
      expect(getMimeType('test.txt')).toBe('text/plain')
      expect(getMimeType('test.md')).toBe('text/markdown')
    })

    it('returns application/octet-stream for unknown types', () => {
      expect(getMimeType('test.xyz')).toBe('application/octet-stream')
      expect(getMimeType('test')).toBe('application/octet-stream')
    })
  })

  describe('getFileCategory', () => {
    it('returns correct category for MIME types', () => {
      expect(getFileCategory('image/png')).toBe('image')
      expect(getFileCategory('video/mp4')).toBe('video')
      expect(getFileCategory('audio/mpeg')).toBe('audio')
      expect(getFileCategory('application/pdf')).toBe('file')
    })
  })

  describe('copyFilesToVault', () => {
    let tempDir: string
    let tempFile: string

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-file-test-'))
      tempFile = path.join(tempDir, 'test.jpg')
      fs.writeFileSync(tempFile, 'fake image content')
      vi.clearAllMocks()
      ;(fsPromises.copyFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      ;(fsPromises.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      ;(fsPromises.stat as ReturnType<typeof vi.fn>).mockResolvedValue({ size: fs.statSync(tempFile).size })
    })

    afterEach(() => {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    })

    it('copies file to images subdirectory for image MIME types', async () => {
      const vaultPath = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-'))

      const result = await copyFilesToVault(vaultPath, [tempFile])

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('image')
      expect(result[0].path).toMatch(/^images\/.*\.jpg$/)
      expect(result[0].name).toBe('test.jpg')
      expect(fsPromises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('images'),
        { recursive: true }
      )
    })

    it('uses UUID for stored filename', async () => {
      const vaultPath = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-'))

      const result = await copyFilesToVault(vaultPath, [tempFile])

      // UUID format: 8-4-4-4-12 hex digits
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      const filename = result[0].path.split('/')[1].split('.')[0]
      expect(filename).toMatch(uuidPattern)
    })

    it('preserves original filename in metadata', async () => {
      const vaultPath = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-'))

      const result = await copyFilesToVault(vaultPath, [tempFile])

      expect(result[0].name).toBe('test.jpg')
    })

    it('gets file size after copy', async () => {
      const vaultPath = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-'))
      ;(fsPromises.stat as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ size: 12345 })

      const result = await copyFilesToVault(vaultPath, [tempFile])

      expect(result[0].size).toBe(12345)
    })
  })

  describe('deleteVaultFile', () => {
    let tempDir: string

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-delete-test-'))
      vi.clearAllMocks()
      ;(fsPromises.unlink as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
    })

    afterEach(() => {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    })

    it('deletes file within vault directory', async () => {
      const filePath = 'images/test.jpg'
      const fullPath = path.join(tempDir, '.dumpere', filePath)
      fs.mkdirSync(path.dirname(fullPath), { recursive: true })
      fs.writeFileSync(fullPath, 'content')

      await deleteVaultFile(tempDir, filePath)

      expect(fsPromises.unlink).toHaveBeenCalledWith(fullPath)
    })

    it('prevents path traversal', async () => {
      await expect(deleteVaultFile(tempDir, '../etc/passwd'))
        .rejects.toThrow('traversal')
    })

    it('prevents absolute path traversal', async () => {
      await expect(deleteVaultFile(tempDir, '/etc/passwd'))
        .rejects.toThrow('traversal')
    })
  })

  describe('getVaultFileUrl', () => {
    it('returns file:// URL with forward slashes', () => {
      const url = getVaultFileUrl('/home/user/vault', 'images/test.jpg')
      expect(url).toBe('file:///home/user/vault/.dumpere/images/test.jpg')
    })

    it('normalizes backslashes to forward slashes', () => {
      const url = getVaultFileUrl('C:\\Users\\vault', 'images/test.jpg')
      expect(url).toContain('file://')
    })
  })
})
