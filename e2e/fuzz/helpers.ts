// e2e/fuzz/helpers.ts

import fs from 'fs'
import os from 'os'
import path from 'path'
import { _electron as electron } from '@playwright/test'
import { fileURLToPath } from 'url'

export function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dumpere-fuzz-'))
}

export function cleanupDir(dir: string): void {
  if (dir) {
    try {
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (e) {
      console.warn(`[Helpers] Failed to cleanup ${dir}: ${e}`)
    }
  }
}

export function createElectronApp() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const appPath = path.join(__dirname, '../../dist/main/index.js')

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

export function createValidVault(): string {
  const vaultDir = createTempDir()
  const dumpereDir = path.join(vaultDir, '.dumpere')
  fs.mkdirSync(dumpereDir)
  fs.mkdirSync(path.join(dumpereDir, 'images'))
  fs.mkdirSync(path.join(dumpereDir, 'videos'))
  fs.mkdirSync(path.join(dumpereDir, 'audio'))
  fs.mkdirSync(path.join(dumpereDir, 'files'))
  fs.mkdirSync(path.join(dumpereDir, 'workspaces'))
  fs.writeFileSync(
    path.join(dumpereDir, 'metadata.json'),
    JSON.stringify({
      version: 2,
      createdAt: Date.now(),
      projects: [],
      tags: [],
      dumps: [],
      summaries: [],
    })
  )
  return vaultDir
}
