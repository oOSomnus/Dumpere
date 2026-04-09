import { rm } from 'fs/promises'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = resolve(__dirname, '..')

for (const target of ['dist', 'release']) {
  await rm(resolve(rootDir, target), { recursive: true, force: true })
  console.log(`Removed ${target}`)
}
