// e2e/fuzz/ui-fuzz/text-fuzz.ts

import { _electron as electron } from '@playwright/test'
import { createValidVault } from '../helpers'
import * as malform from '../generators/malform'
import * as random from '../generators/random'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

interface FuzzResult {
  input: string
  error?: string
  crashed: boolean
}

function createElectronApp() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const appPath = path.join(__dirname, '../../../dist/main/index.js')

  const electronEnv = {
    ...process.env,
    ELECTRON_DISABLE_SANDBOX: '1',
  }
  delete electronEnv.ELECTRON_RUN_AS_NODE

  return electron.launch({
    args: ['--no-sandbox', appPath],
    env: electronEnv,
  })
}

export async function fuzzTextInputs(iterations: number = 10): Promise<FuzzResult[]> {
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

      const fuzzType = Math.floor(Math.random() * 4)
      let fuzzedText = ''

      switch (fuzzType) {
        case 0:
          fuzzedText = malform.getRandomMalform('xssPayloads')
          break
        case 1:
          fuzzedText = random.randomUnicode(10000)
          break
        case 2:
          fuzzedText = random.randomAlphaNumeric(5000).split('').map(c => '💩\x00\t\n\r\x01\x02' [Math.floor(Math.random() * 7)] || c).join('')
          break
        case 3:
          fuzzedText = random.randomDumpText()
          break
      }

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
        input: fuzzedText.slice(0, 100),
        crashed: false,
        error: result.success ? undefined : result.error,
      })
    } catch (e) {
      results.push({
        input: 'unknown',
        crashed: true,
        error: String(e),
      })
    } finally {
      if (app) await app.close()
      if (vaultDir) {
        try { fs.rmSync(vaultDir, { recursive: true, force: true }) } catch {}
      }
    }
  }

  return results
}

export default fuzzTextInputs
