import { _electron as electron } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appPath = path.join(__dirname, '../dist/main/index.js')

const electronEnv = {
  ...process.env,
  ELECTRON_DISABLE_SANDBOX: '1',
}

delete electronEnv.ELECTRON_RUN_AS_NODE

export async function launchApp() {
  return electron.launch({
    args: ['--no-sandbox', appPath],
    env: electronEnv,
  })
}
