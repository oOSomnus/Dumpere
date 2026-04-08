import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import os from 'os'

test.describe('Vault E2E Tests', () => {
  let tempDirs: string[] = []

  test.afterEach(async () => {
    for (const dir of tempDirs) {
      try {
        fs.rmSync(dir, { recursive: true, force: true })
      } catch {}
    }
    tempDirs = []
  })

  function createTempDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dumpere-e2e-'))
    tempDirs.push(dir)
    return dir
  }

  test('welcome screen displays', async ({ _electron }) => {
    const electronApp = await _electron.launch({
      args: [path.join(__dirname, '../dist')],
    })

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    await expect(window.getByRole('heading', { name: 'Dumpere' })).toBeVisible()
    await expect(window.getByRole('button', { name: /Create Vault/i })).toBeVisible()
    await expect(window.getByRole('button', { name: /Open Vault/i })).toBeVisible()
    await expect(window.getByText('Quick work completion tracking')).toBeVisible()

    await electronApp.close()
  })

  test('create vault success', async ({ _electron }) => {
    const electronApp = await _electron.launch({
      args: [path.join(__dirname, '../dist')],
    })

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    const emptyDir = createTempDir()

    await electronApp.evaluate(async ({ dialog }, emptyPath) => {
      dialog.showOpenDialog = async () => {
        return { canceled: false, filePaths: [emptyPath] }
      }
    }, emptyDir)

    await window.getByRole('button', { name: /Create Vault/i }).click()
    await expect(window.getByRole('heading', { name: 'Dumpere' })).toBeVisible({ timeout: 5000 })

    const dumpereDir = path.join(emptyDir, '.dumpere')
    expect(fs.existsSync(dumpereDir)).toBe(true)
    expect(fs.existsSync(path.join(dumpereDir, 'metadata.json'))).toBe(true)
    expect(fs.existsSync(path.join(dumpereDir, 'images'))).toBe(true)
    expect(fs.existsSync(path.join(dumpereDir, 'videos'))).toBe(true)
    expect(fs.existsSync(path.join(dumpereDir, 'audio'))).toBe(true)
    expect(fs.existsSync(path.join(dumpereDir, 'files'))).toBe(true)

    const metadata = JSON.parse(fs.readFileSync(path.join(dumpereDir, 'metadata.json'), 'utf-8'))
    expect(metadata.version).toBe('1.0')
    expect(metadata.dumps).toEqual([])

    await electronApp.close()
  })

  test('create vault rejects non-empty', async ({ _electron }) => {
    const electronApp = await _electron.launch({
      args: [path.join(__dirname, '../dist')],
    })

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    const nonEmptyDir = createTempDir()
    fs.writeFileSync(path.join(nonEmptyDir, 'somefile.txt'), 'not empty')

    await electronApp.evaluate(async ({ dialog }, nonEmptyPath) => {
      dialog.showOpenDialog = async () => {
        return { canceled: false, filePaths: [nonEmptyPath] }
      }
    }, nonEmptyDir)

    await window.getByRole('button', { name: /Create Vault/i }).click()
    await expect(window.getByText(/Choose an empty folder/i)).toBeVisible({ timeout: 5000 })

    await electronApp.close()
  })

  test('open vault success', async ({ _electron }) => {
    const electronApp = await _electron.launch({
      args: [path.join(__dirname, '../dist')],
    })

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    const vaultDir = createTempDir()
    const dumpereDir = path.join(vaultDir, '.dumpere')
    fs.mkdirSync(dumpereDir)
    fs.mkdirSync(path.join(dumpereDir, 'images'))
    fs.mkdirSync(path.join(dumpereDir, 'videos'))
    fs.mkdirSync(path.join(dumpereDir, 'audio'))
    fs.mkdirSync(path.join(dumpereDir, 'files'))
    fs.writeFileSync(
      path.join(dumpereDir, 'metadata.json'),
      JSON.stringify({ version: '1.0', created: new Date().toISOString(), dumps: [] })
    )

    await electronApp.evaluate(async ({ dialog }, vaultPath) => {
      dialog.showOpenDialog = async () => {
        return { canceled: false, filePaths: [vaultPath] }
      }
    }, vaultDir)

    await window.getByRole('button', { name: /Open Vault/i }).click()
    await window.waitForTimeout(1000)

    await expect(window.getByRole('heading', { name: 'Dumpere' })).toBeVisible()

    await electronApp.close()
  })

  test('open vault rejects invalid', async ({ _electron }) => {
    const electronApp = await _electron.launch({
      args: [path.join(__dirname, '../dist')],
    })

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    const invalidDir = createTempDir()

    await electronApp.evaluate(async ({ dialog }, invalidPath) => {
      dialog.showOpenDialog = async () => {
        return { canceled: false, filePaths: [invalidPath] }
      }
    }, invalidDir)

    await window.getByRole('button', { name: /Open Vault/i }).click()
    await expect(window.getByText(/not a Dumpere vault/i)).toBeVisible({ timeout: 5000 })

    await electronApp.close()
  })

  test('vault-first enforcement', async ({ _electron }) => {
    const electronApp = await _electron.launch({
      args: [path.join(__dirname, '../dist')],
    })

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    await expect(window.getByRole('heading', { name: 'Dumpere' })).toBeVisible()
    await expect(window.getByRole('button', { name: /Create Vault/i })).toBeVisible()

    await electronApp.close()
  })
})
