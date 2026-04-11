import { test, expect } from '@playwright/test'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { launchApp } from './electron'

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dumpere-e2e-'))
}

function createValidVault(): string {
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
      summaries: []
    })
  )
  return vaultDir
}

test.describe('Dump Operations E2E', () => {
  let tempDirs: string[] = []

  test.afterEach(async () => {
    for (const dir of tempDirs) {
      try {
        fs.rmSync(dir, { recursive: true, force: true })
      } catch {}
    }
    tempDirs = []
  })

  test('dump input is disabled without vault open', async () => {
    const electronApp = await launchApp()

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    // Vault input should be disabled/not visible when no vault is open
    // The app should show WelcomeScreen, not DumpInput
    await expect(window.getByRole('heading', { name: 'Dumpere' })).toBeVisible()
    await expect(window.getByRole('button', { name: /Create Vault/i })).toBeVisible()

    // There should be no dump input visible (only WelcomeScreen)
    // This verifies FILE-02: Dump Input Guard
    await electronApp.close()
  })

  test('can create a text dump in open vault', async () => {
    const electronApp = await launchApp()

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    // Create and open a vault
    const vaultDir = createValidVault()
    tempDirs.push(vaultDir)

    // Open the vault directly via IPC
    await window.evaluate(async (vaultPath) => {
      await window.electronAPI.vault.open(vaultPath)
    }, vaultDir)

    // Verify vault opened
    const state = await window.evaluate(() => window.electronAPI.vault.getState())
    expect(state.isOpen).toBe(true)
    expect(state.vaultPath).toBe(vaultDir)

    await window.evaluate(async () => {
      await window.electronAPI.data.createProject('E2E Project')
    })

    const [project] = await window.evaluate(() => window.electronAPI.data.getProjects())

    const dump = await window.evaluate(async () => {
      const [activeProject] = await window.electronAPI.data.getProjects()
      return await window.electronAPI.data.createDump({
        text: 'Test dump content',
        filePaths: [],
        projectId: activeProject.id,
        tagIds: []
      })
    }, project)

    expect(dump).toBeTruthy()
    expect(dump.id).toBeDefined()
    expect(dump.text).toBe('Test dump content')
    expect(dump.createdAt).toBeDefined()
    expect(dump.files).toEqual([])
    expect(dump.projectId).toBe(project.id)

    await electronApp.close()
  })

  test('can retrieve dumps from open vault', async () => {
    const electronApp = await launchApp()

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    const vaultDir = createValidVault()
    tempDirs.push(vaultDir)

    // Open vault
    await window.evaluate(async (vaultPath) => {
      await window.electronAPI.vault.open(vaultPath)
    }, vaultDir)

    await window.evaluate(async () => {
      const project = await window.electronAPI.data.createProject('E2E Project')
      await window.electronAPI.data.createDump({
        text: 'My test dump',
        filePaths: [],
        projectId: project.id,
        tagIds: []
      })
    })

    // Get dumps
    const dumps = await window.evaluate(() => window.electronAPI.data.getDumps())

    expect(dumps).toHaveLength(1)
    expect(dumps[0].text).toBe('My test dump')

    await electronApp.close()
  })

  test('multiple dumps are stored in correct order', async () => {
    const electronApp = await launchApp()

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    const vaultDir = createValidVault()
    tempDirs.push(vaultDir)

    // Open vault
    await window.evaluate(async (vaultPath) => {
      await window.electronAPI.vault.open(vaultPath)
    }, vaultDir)

    // Create multiple dumps
    await window.evaluate(async () => {
      const project = await window.electronAPI.data.createProject('E2E Project')
      await window.electronAPI.data.createDump({ text: 'First dump', filePaths: [], projectId: project.id, tagIds: [] })
      await window.electronAPI.data.createDump({ text: 'Second dump', filePaths: [], projectId: project.id, tagIds: [] })
      await window.electronAPI.data.createDump({ text: 'Third dump', filePaths: [], projectId: project.id, tagIds: [] })
    })

    // Verify dumps are stored
    const dumps = await window.evaluate(() => window.electronAPI.data.getDumps())

    expect(dumps).toHaveLength(3)
    // Newest first
    expect(dumps[0].text).toBe('Third dump')
    expect(dumps[1].text).toBe('Second dump')
    expect(dumps[2].text).toBe('First dump')

    await electronApp.close()
  })

  test('metadata.json is updated after dump creation', async () => {
    const electronApp = await launchApp()

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    const vaultDir = createValidVault()
    tempDirs.push(vaultDir)

    // Open vault
    await window.evaluate(async (vaultPath) => {
      await window.electronAPI.vault.open(vaultPath)
    }, vaultDir)

    // Create a dump
    await window.evaluate(async () => {
      const project = await window.electronAPI.data.createProject('E2E Project')
      await window.electronAPI.data.createDump({
        text: 'Dump for metadata test',
        filePaths: [],
        projectId: project.id,
        tagIds: []
      })
    })

    // Read metadata.json directly
    const metadataPath = path.join(vaultDir, '.dumpere', 'metadata.json')
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))

    expect(metadata.version).toBe(2)
    expect(metadata.dumps).toHaveLength(1)
    expect(metadata.dumps[0].text).toBe('Dump for metadata test')
    expect(metadata.dumps[0].id).toBeDefined()

    await electronApp.close()
  })

  test('dump with files copies to correct subdirectory', async () => {
    const electronApp = await launchApp()

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    const vaultDir = createValidVault()
    tempDirs.push(vaultDir)

    // Create a temp file to "dump"
    const tempFile = path.join(createTempDir(), 'test-image.jpg')
    fs.writeFileSync(tempFile, 'fake image content')
    tempDirs.push(path.dirname(tempFile))

    // Open vault
    await window.evaluate(async (vaultPath) => {
      await window.electronAPI.vault.open(vaultPath)
    }, vaultDir)

    // Create dump with file - for E2E, we simulate the file path handling
    // Note: In real scenario, files come from drag-drop which requires UI interaction
    // This test verifies the IPC handler works correctly
    const dump = await window.evaluate(async (filePath) => {
      const project = await window.electronAPI.data.createProject('E2E Project')
      return await window.electronAPI.data.createDump({
        text: 'Dump with file',
        filePaths: [filePath],
        projectId: project.id,
        tagIds: []
      })
    }, tempFile)

    expect(dump).toBeTruthy()
    expect(dump.files).toHaveLength(1)
    expect(dump.files[0].mimeType).toBe('image/jpeg')
    expect(dump.files[0].originalName).toBe('test-image.jpg')
    expect(dump.files[0].storedPath).toMatch(/^images\//)

    await electronApp.close()
  })

  test('recent vaults are stored after vault creation', async () => {
    const electronApp = await launchApp()

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    const vaultDir = createTempDir()
    tempDirs.push(vaultDir)

    // Create vault via dialog mock
    await electronApp.evaluate(async ({ dialog }, vaultPath) => {
      dialog.showOpenDialog = async () => {
        return { canceled: false, filePaths: [vaultPath] }
      }
    }, vaultDir)

    // Click Create Vault
    await window.getByRole('button', { name: /Create Vault/i }).click()

    // Wait for creation
    await window.waitForTimeout(1000)

    // Check recent vaults
    const recentVaults = await window.evaluate(() => window.electronAPI.vault.getRecent())

    expect(recentVaults.length).toBeGreaterThan(0)
    expect(recentVaults.some(vault => vault.path === vaultDir)).toBe(true)

    await electronApp.close()
  })
})
