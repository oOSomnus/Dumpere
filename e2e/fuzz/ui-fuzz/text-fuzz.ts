// e2e/fuzz/ui-fuzz/text-fuzz.ts

import { type ElectronApplication } from '@playwright/test'
import { createValidVault } from '../helpers'
import * as malform from '../generators/malform'
import * as random from '../generators/random'

interface FuzzResult {
  input: string
  error?: string
  crashed: boolean
}

export async function fuzzTextInputs(
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

      // Create a project first
      await window.evaluate(async () => {
        await window.electronAPI.data.createProject('FuzzTest')
      })

      // Generate fuzzed input
      const fuzzType = Math.floor(Math.random() * 4)
      let fuzzedText = ''

      switch (fuzzType) {
        case 0: // XSS payload
          fuzzedText = malform.getRandomMalform('xssPayloads')
          break
        case 1: // Super long string
          fuzzedText = random.randomUnicode(10000)
          break
        case 2: // Special characters
          fuzzedText = random.randomString(5000, '💩\x00\t\n\r\x01\x02')
          break
        case 3: // Random
          fuzzedText = random.randomDumpText()
          break
      }

      // Try to create dump with fuzzed text
      const result = await window.evaluate(async (text) => {
        try {
          const [project] = await window.electronAPI.data.getProjects()
          const dump = await window.electronAPI.data.createDump({
            text,
            filePaths: [],
            projectId: project.id,
            tagIds: [],
          })
          return { success: true, dumpId: dump.id }
        } catch (e) {
          return { success: false, error: String(e) }
        }
      }, fuzzedText)

      results.push({
        input: fuzzedText.slice(0, 100), // Truncate for logging
        crashed: false,
        error: result.success ? undefined : result.error,
      })
    } catch (e) {
      results.push({
        input: fuzzedText?.slice(0, 100) ?? 'unknown',
        crashed: true,
        error: String(e),
      })
    } finally {
      await electronApp.close()
    }
  }

  return results
}

export default fuzzTextInputs
