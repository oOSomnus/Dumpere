// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createEmptyMetadata,
  getMetadataPath,
  readMetadata,
  writeMetadata
} from './metadata-service'

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>()
  return {
    ...actual
  }
})

function createTempVaultDir(): string {
  const vaultPath = mkdtempSync(join(tmpdir(), 'dumpere-metadata-'))
  mkdirSync(join(vaultPath, '.dumpere'), { recursive: true })
  return vaultPath
}

describe('metadata-service', () => {
  const createdDirs: string[] = []

  afterEach(() => {
    createdDirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }))
  })

  it('creates empty v2 metadata', () => {
    const metadata = createEmptyMetadata()

    expect(metadata.version).toBe(2)
    expect(metadata.createdAt).toEqual(expect.any(Number))
    expect(metadata.projects).toEqual([])
    expect(metadata.tags).toEqual([])
    expect(metadata.dumps).toEqual([])
    expect(metadata.summaries).toEqual([])
  })

  it('returns the metadata path inside .dumpere', async () => {
    const vaultPath = createTempVaultDir()
    createdDirs.push(vaultPath)

    expect(getMetadataPath(vaultPath)).toBe(join(vaultPath, '.dumpere', 'metadata.json'))
  })

  it('writes metadata atomically and reads it back', async () => {
    const vaultPath = createTempVaultDir()
    createdDirs.push(vaultPath)

    const metadata = {
      ...createEmptyMetadata(),
      createdAt: 123,
      projects: [{ id: 'project-1', name: 'Alpha', createdAt: 123 }],
      tags: [{ id: 'tag-1', name: 'deep work', createdAt: 124 }],
      dumps: [{
        id: 'dump-1',
        text: 'Wrote the refactor plan',
        files: [],
        createdAt: 125,
        updatedAt: 125,
        projectId: 'project-1',
        tags: ['tag-1']
      }],
      summaries: [{
        id: 'summary-1',
        type: 'daily' as const,
        projectId: 'project-1',
        generatedAt: 126,
        content: '# Summary',
        dumpCount: 1
      }]
    }

    await writeMetadata(vaultPath, metadata)

    expect(existsSync(getMetadataPath(vaultPath))).toBe(true)
    expect(existsSync(`${getMetadataPath(vaultPath)}.tmp`)).toBe(false)
    expect(JSON.parse(readFileSync(getMetadataPath(vaultPath), 'utf8'))).toEqual(metadata)
    await expect(readMetadata(vaultPath)).resolves.toEqual(metadata)
  })

  it('rejects metadata that does not match the v2 schema', async () => {
    const vaultPath = createTempVaultDir()
    createdDirs.push(vaultPath)

    writeFileSync(getMetadataPath(vaultPath), JSON.stringify({
      version: 1,
      createdAt: 123,
      projects: [],
      tags: [],
      dumps: [],
      summaries: []
    }))

    await expect(readMetadata(vaultPath)).rejects.toThrow('unsupported version')
  })

  it('rejects malformed metadata JSON', async () => {
    const vaultPath = createTempVaultDir()
    createdDirs.push(vaultPath)

    writeFileSync(getMetadataPath(vaultPath), '{not-json')

    await expect(readMetadata(vaultPath)).rejects.toThrow()
  })
})
