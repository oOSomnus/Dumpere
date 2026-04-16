// e2e/fuzz/ui-fuzz/file-fuzz.ts

import { type ElectronApplication } from '@playwright/test'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createValidVault } from '../helpers'
import * as random from '../generators/random'

interface FuzzResult {
  filename: string
  error?: string
  crashed: boolean
}

function createMalformedFile(type: 'image' | 'text' | 'binary' | 'oversized'): string {
  const tempDir = os.tmpdir()
  const filename = random.randomFilename()

  switch (type) {
    case 'image': {
      // Corrupt image with garbage
      const buffer = Buffer.from(random.randomString(10000))
      const filePath = path.join(tempDir, filename)
      fs.writeFileSync(filePath, buffer)
      return filePath
    }
    case 'text': {
      // File with path traversal name
      const content = 'benign content'
      const filePath = path.join(tempDir, '../../../etc/test.txt')
      fs.writeFileSync(filePath, content)
      return filePath
    }
    case 'binary': {
      // Null bytes and control chars
      const buffer = Buffer.from('\x00\x01\x02\x03\xFF\xFE\xFD' * 1000, 'binary')
      const filePath = path.join(tempDir, filename)
      fs.writeFileSync(filePath, buffer)
      return filePath
    }
    case 'oversized': {
      // 10MB file (not 100MB to avoid timeout)
      const filePath = path.join(tempDir, filename)
      const fd = fs.openSync(filePath, 'w')
      for (let i = 0; i < 10; i++) {
        fs.writeSync(fd, Buffer.alloc(1024 * 1024, 'A'))
      }
      fs.closeSync(fd)
      return filePath
    }
  }
}

export async function fuzzFileAttachments(
  electronApp: ElectronApplication,
  iterations: number = 10
): Promise<FuzzResult[]> {
  const results: FuzzResult[] = []

  for (let i = 0; i < iterations; i++) {
    const window = await electronApp.firstWindow()
    const vaultDir = createValidVault()

    try {
      await window.evaluate(async (vaultPath) => {
        await window.electronAPI.vault.open(vaultPath)
      }, vaultDir)

      await window.evaluate(async () => {
        await window.electronAPI.data.createProject('FuzzTest')
      })

      // Create malformed file
      const fileTypes: Array<'image' | 'text' | 'binary' | 'oversized'> = ['image', 'text', 'binary', 'oversized']
      const fileType = fileTypes[Math.floor(Math.random() * fileTypes.length)!]
      const filePath = createMalformedFile(fileType)

      const result = await window.evaluate(async (fpath) => {
        try {
          const [project] = await window.electronAPI.data.getProjects()
          const dump = await window.electronAPI.data.createDump({
            text: 'File fuzz test',
            filePaths: [fpath],
            projectId: project.id,
            tagIds: [],
          })
          return { success: true, dumpId: dump.id, hasFiles: dump.files.length > 0 }
        } catch (e) {
          return { success: false, error: String(e) }
        }
      }, filePath)

      results.push({
        filename: path.basename(filePath),
        crashed: false,
        error: result.success ? undefined : result.error,
      })
    } catch (e) {
      results.push({
        filename: 'unknown',
        crashed: true,
        error: String(e),
      })
    } finally {
      await electronApp.close()
    }
  }

  return results
}

export default fuzzFileAttachments
