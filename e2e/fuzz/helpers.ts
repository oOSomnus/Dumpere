// e2e/fuzz/helpers.ts

import fs from 'fs'
import os from 'os'
import path from 'path'

export function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dumpere-fuzz-'))
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
