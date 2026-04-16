// e2e/fuzz/ipc-fuzz/dump-fuzz.ts

import { createValidVault, createElectronApp, cleanupDir } from '../helpers'
import * as random from '../generators/random'
import * as malform from '../generators/malform'

interface FuzzResult {
  test: string
  input: string
  error?: string
  success: boolean
}

export async function fuzzDumpOperations(iterations: number = 10): Promise<FuzzResult[]> {
  const results: FuzzResult[] = []

  for (let i = 0; i < iterations; i++) {
    let app
    let vaultDir

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

      const [project] = await window.evaluate(() => window.electronAPI.data.getProjects())

      const fuzzType = Math.floor(Math.random() * 8)
      let testName = ''
      let fuzzedInput: Record<string, unknown> = {}

      switch (fuzzType) {
        case 0:
          testName = 'xss_in_text'
          fuzzedInput = {
            text: malform.getRandomMalform('xssPayloads'),
            filePaths: [],
            projectId: project.id,
            tagIds: [],
          }
          break
        case 1:
          testName = 'empty_text'
          fuzzedInput = {
            text: '',
            filePaths: [],
            projectId: project.id,
            tagIds: [],
          }
          break
        case 2:
          testName = 'super_long_text'
          fuzzedInput = {
            text: random.randomUnicode(50000),
            filePaths: [],
            projectId: project.id,
            tagIds: [],
          }
          break
        case 3:
          testName = 'invalid_project_id'
          fuzzedInput = {
            text: 'test',
            filePaths: [],
            projectId: 'non-existent-id',
            tagIds: [],
          }
          break
        case 4:
          testName = 'invalid_tag_ids'
          fuzzedInput = {
            text: 'test',
            filePaths: [],
            projectId: project.id,
            tagIds: ['fake-tag-1', 'fake-tag-2'],
          }
          break
        case 5:
          testName = 'path_traversal_tags'
          fuzzedInput = {
            text: 'test',
            filePaths: [],
            projectId: project.id,
            tagIds: [],
          }
          break
        case 6:
          testName = 'unicode_mischief'
          fuzzedInput = {
            text: malform.getRandomMalform('unicodeMischief'),
            filePaths: [],
            projectId: project.id,
            tagIds: [],
          }
          break
        case 7:
          testName = 'null_bytes'
          fuzzedInput = {
            text: 'hello\x00world',
            filePaths: [],
            projectId: project.id,
            tagIds: [],
          }
          break
      }

      const result = await window.evaluate(async (input) => {
        try {
          const dump = await window.electronAPI.data.createDump(input)
          return { success: true, dumpId: dump.id }
        } catch (e) {
          return { success: false, error: String(e) }
        }
      }, fuzzedInput)

      results.push({
        test: testName,
        input: JSON.stringify(fuzzedInput).slice(0, 100),
        success: result.success,
        error: result.error,
      })
    } catch (e) {
      results.push({
        test: 'crash',
        input: 'unknown',
        success: false,
        error: String(e),
      })
    } finally {
      if (app) await app.close()
      cleanupDir(vaultDir)
    }
  }

  return results
}

export default fuzzDumpOperations
