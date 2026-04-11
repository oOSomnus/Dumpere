// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'

const mocks = vi.hoisted(() => ({
  showOpenDialog: vi.fn(),
  storeGet: vi.fn(),
  storeSet: vi.fn()
}))

vi.mock('electron', () => ({
  dialog: {
    showOpenDialog: mocks.showOpenDialog
  }
}))

vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('./store', () => ({
  store: {
    get: mocks.storeGet,
    set: mocks.storeSet
  }
}))

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>()
  return {
    ...actual
  }
})

describe('vault-service', () => {
  let tempDir: string
  let vaultService: typeof import('./vault-service')

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    tempDir = mkdtempSync(join(tmpdir(), 'dumpere-vault-service-'))
    mocks.storeGet.mockImplementation((key: string, fallback: unknown) => {
      if (key === 'recentVaults') {
        return []
      }
      return fallback
    })

    vaultService = await import('./vault-service')
  })

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('creates a vault with v2 metadata and workspace directories', async () => {
    mocks.showOpenDialog.mockResolvedValueOnce({
      canceled: false,
      filePaths: [tempDir]
    })

    const state = await vaultService.createVault()

    expect(state).toEqual({
      isOpen: true,
      vaultPath: tempDir,
      vaultName: basename(tempDir)
    })
    expect(existsSync(join(tempDir, '.dumpere', 'metadata.json'))).toBe(true)
    expect(existsSync(join(tempDir, '.dumpere', 'images'))).toBe(true)
    expect(existsSync(join(tempDir, '.dumpere', 'videos'))).toBe(true)
    expect(existsSync(join(tempDir, '.dumpere', 'audio'))).toBe(true)
    expect(existsSync(join(tempDir, '.dumpere', 'files'))).toBe(true)
    expect(existsSync(join(tempDir, '.dumpere', 'workspaces'))).toBe(true)

    const metadata = JSON.parse(readFileSync(join(tempDir, '.dumpere', 'metadata.json'), 'utf8'))
    expect(metadata).toMatchObject({
      version: 2,
      projects: [],
      tags: [],
      dumps: [],
      summaries: []
    })
    expect(mocks.storeSet).toHaveBeenCalledWith('recentVaults', [
      expect.objectContaining({
        path: tempDir,
        name: basename(tempDir)
      })
    ])
  })

  it('rejects creating a vault in a non-empty directory', async () => {
    writeFileSync(join(tempDir, 'notes.txt'), 'busy directory')
    mocks.showOpenDialog.mockResolvedValueOnce({
      canceled: false,
      filePaths: [tempDir]
    })

    await expect(vaultService.createVault()).rejects.toThrow('empty folder')
  })

  it('allows README.md and .gitignore in an otherwise empty directory', async () => {
    writeFileSync(join(tempDir, 'README.md'), '# Vault')
    writeFileSync(join(tempDir, '.gitignore'), '.DS_Store')
    mocks.showOpenDialog.mockResolvedValueOnce({
      canceled: false,
      filePaths: [tempDir]
    })

    await expect(vaultService.createVault()).resolves.toMatchObject({
      isOpen: true,
      vaultPath: tempDir
    })
  })

  it('opens a valid v2 vault', async () => {
    mkdirSync(join(tempDir, '.dumpere', 'workspaces'), { recursive: true })
    mkdirSync(join(tempDir, '.dumpere', 'images'), { recursive: true })
    mkdirSync(join(tempDir, '.dumpere', 'videos'), { recursive: true })
    mkdirSync(join(tempDir, '.dumpere', 'audio'), { recursive: true })
    mkdirSync(join(tempDir, '.dumpere', 'files'), { recursive: true })
    writeFileSync(join(tempDir, '.dumpere', 'metadata.json'), JSON.stringify({
      version: 2,
      createdAt: Date.now(),
      projects: [],
      tags: [],
      dumps: [],
      summaries: []
    }))

    await expect(vaultService.openVault(tempDir)).resolves.toEqual({
      isOpen: true,
      vaultPath: tempDir,
      vaultName: basename(tempDir)
    })
  })

  it('rejects folders that are not Dumpere vaults', async () => {
    await expect(vaultService.openVault(tempDir)).rejects.toThrow('not a Dumpere vault')
  })

  it('rejects vaults with unsupported metadata versions', async () => {
    mkdirSync(join(tempDir, '.dumpere'), { recursive: true })
    writeFileSync(join(tempDir, '.dumpere', 'metadata.json'), JSON.stringify({
      version: 1,
      createdAt: Date.now(),
      projects: [],
      tags: [],
      dumps: [],
      summaries: []
    }))

    await expect(vaultService.openVault(tempDir)).rejects.toThrow('unsupported version')
  })

  it('validates vault roots defensively', () => {
    expect(vaultService.validateVaultRoot('/home/user/vault')).toBe(true)
    expect(vaultService.validateVaultRoot('/home/user/../secrets')).toBe(false)
    expect(vaultService.validateVaultRoot('C:\\Users\\..\\etc')).toBe(false)
  })

  it('starts with a closed vault state', () => {
    expect(vaultService.getVaultState()).toEqual({
      isOpen: false,
      vaultPath: null,
      vaultName: null
    })
  })
})
