// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const mocks = vi.hoisted(() => ({
  getVaultState: vi.fn()
}))

vi.mock('../vault-service', () => ({
  getVaultState: mocks.getVaultState
}))

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>()
  return {
    ...actual
  }
})

vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

describe('vault data repository regression', () => {
  let tempDir: string

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    tempDir = mkdtempSync(join(tmpdir(), 'dumpere-repository-'))
    mkdirSync(join(tempDir, '.dumpere', 'images'), { recursive: true })
    mkdirSync(join(tempDir, '.dumpere', 'videos'), { recursive: true })
    mkdirSync(join(tempDir, '.dumpere', 'audio'), { recursive: true })
    mkdirSync(join(tempDir, '.dumpere', 'files'), { recursive: true })
    mkdirSync(join(tempDir, '.dumpere', 'workspaces'), { recursive: true })
    writeFileSync(join(tempDir, '.dumpere', 'metadata.json'), JSON.stringify({
      version: 2,
      createdAt: Date.now(),
      projects: [],
      tags: [],
      dumps: [],
      summaries: []
    }))

    mocks.getVaultState.mockReturnValue({
      isOpen: true,
      vaultPath: tempDir,
      vaultName: 'Temp Vault'
    })
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('loads empty vault data and still saves dumps after creating a project', async () => {
    const { getDumps, getProjects, getTags, createProject, createDump } = await import('../vault-data-repository')

    await expect(getDumps()).resolves.toEqual([])
    await expect(getProjects()).resolves.toEqual([])
    await expect(getTags()).resolves.toEqual([])

    const project = await createProject('Alpha')
    const createdDump = await createDump({
      text: 'First dump',
      filePaths: [],
      projectId: project.id,
      tagIds: []
    })

    await expect(getProjects()).resolves.toEqual([project])
    await expect(getDumps()).resolves.toEqual([createdDump])
  })
})
