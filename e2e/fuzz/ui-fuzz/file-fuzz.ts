// e2e/fuzz/ui-fuzz/file-fuzz.ts

import { createValidVault, createElectronApp, cleanupDir } from '../helpers'
import * as random from '../generators/random'
import path from 'path'
import fs from 'fs'
import os from 'os'

interface FuzzResult {
  filename: string
  error?: string
  crashed: boolean
}

function createMalformedFile(type: 'image' | 'text' | 'binary' | 'oversized'): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dumpere-fuzz-'))
  const filename = random.randomFilename()

  switch (type) {
    case 'image': {
      const buffer = Buffer.from(random.randomAlphaNumeric(10000))
      const filePath = path.join(tempDir, filename)
      fs.writeFileSync(filePath, buffer)
      return filePath
    }
    case 'text': {
      // Test with text file containing special content
      const content = 'benign content'
      const filePath = path.join(tempDir, filename)
      fs.writeFileSync(filePath, content)
      return filePath
    }
    case 'binary': {
      const buffer = Buffer.from('\x00\x01\x02\x03\xFF\xFE\xFD'.repeat(1000), 'binary')
      const filePath = path.join(tempDir, filename)
      fs.writeFileSync(filePath, buffer)
      return filePath
    }
    case 'oversized': {
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

export async function fuzzFileAttachments(iterations: number = 10): Promise<FuzzResult[]> {
  const results: FuzzResult[] = []

  for (let i = 0; i < iterations; i++) {
    let app
    let vaultDir
    let tempFilePath = ''

    try {
      app = await createElectronApp()
      const window = await app.firstWindow()
      vaultDir = createValidVault()

      await window.evaluate(async (vaultPath) => {
        await window.electronAPI.vault.open(vaultPath)
      }, vaultDir)

      await window.evaluate(async () => {
        await window.electronAPI.data.createProject('FuzzTest')
      })

      const fileTypes: Array<'image' | 'text' | 'binary' | 'oversized'> = ['image', 'text', 'binary', 'oversized']
      const fileType = fileTypes[Math.floor(Math.random() * fileTypes.length)]!
      tempFilePath = createMalformedFile(fileType)

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
      }, tempFilePath)

      results.push({
        filename: path.basename(tempFilePath),
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
      if (app) await app.close()
      cleanupDir(vaultDir)
      cleanupDir(tempFilePath ? path.dirname(tempFilePath) : '')
    }
  }

  return results
}

export default fuzzFileAttachments
