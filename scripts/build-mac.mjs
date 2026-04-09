import { spawnSync } from 'node:child_process'

const target = process.platform === 'darwin' ? 'dmg' : 'zip'
const result = spawnSync('pnpm', ['exec', 'electron-builder', '--mac', target], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
})

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 1)
