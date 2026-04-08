import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fs, path, os } from 'vitest/node'
import { readMetadata, writeMetadata, createDump } from './metadata-service'

// Mock electron-log
vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

// Mock vault-service
vi.mock('./vault-service', () => ({
  getVaultState: vi.fn(() => ({ isOpen: false, vaultPath: null, vaultName: null })),
}))

// Mock file-service
vi.mock('./file-service', () => ({
  copyFilesToVault: vi.fn(() => []),
  deleteVaultFile: vi.fn(),
}))

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  rename: vi.fn(),
  unlink: vi.fn(),
}))

describe('metadata-service', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metadata-test-'))
    vi.clearAllMocks()
    // Reset the write queue by re-importing
    vi.resetModules()
  })

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('readMetadata', () => {
    it('returns null when metadata.json does not exist', async () => {
      const result = await readMetadata(tempDir)
      expect(result).toBeNull()
    })

    it('returns parsed metadata for valid JSON file', async () => {
      const dumpereDir = path.join(tempDir, '.dumpere')
      fs.mkdirSync(dumpereDir, { recursive: true })
      const metadata = {
        version: '1.0',
        created: '2024-01-01T00:00:00.000Z',
        dumps: []
      }
      fs.writeFileSync(
        path.join(dumpereDir, 'metadata.json'),
        JSON.stringify(metadata)
      )
      // Mock readFile to return the content
      const { readFile } = await import('fs/promises')
      ;(readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(JSON.stringify(metadata))

      const result = await readMetadata(tempDir)
      expect(result).toEqual(metadata)
    })
  })

  describe('writeMetadata', () => {
    it('performs atomic write via temp file and rename', async () => {
      const dumpereDir = path.join(tempDir, '.dumpere')
      fs.mkdirSync(dumpereDir, { recursive: true })
      const metadata = { version: '1.0', created: '2024-01-01', dumps: [] }

      await writeMetadata(tempDir, metadata)

      // Verify writeFile was called with temp path
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.dumpere/metadata.json.tmp'),
        expect.any(String),
        'utf-8'
      )
      // Verify rename was called
      expect(fs.rename).toHaveBeenCalledWith(
        expect.stringContaining('.tmp'),
        expect.stringContaining('metadata.json')
      )
    })
  })

  describe('createDump', () => {
    it('throws when no vault is open', async () => {
      const { getVaultState } = await import('./vault-service')
      ;(getVaultState as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        isOpen: false,
        vaultPath: null,
        vaultName: null
      })

      await expect(createDump({ text: 'test', filePaths: [] }))
        .rejects.toThrow('No vault open')
    })

    it('creates dump with UUID when vault is open', async () => {
      const dumpereDir = path.join(tempDir, '.dumpere')
      fs.mkdirSync(dumpereDir, { recursive: true })
      fs.writeFileSync(
        path.join(dumpereDir, 'metadata.json'),
        JSON.stringify({ version: '1.0', created: '2024-01-01', dumps: [] })
      )

      const { getVaultState } = await import('./vault-service')
      ;(getVaultState as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        isOpen: true,
        vaultPath: tempDir,
        vaultName: 'test-vault'
      })

      // Mock readFile to return empty metadata
      const { readFile } = await import('fs/promises')
      ;(readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        JSON.stringify({ version: '1.0', created: '2024-01-01', dumps: [] })
      )

      const result = await createDump({ text: 'Test dump content', filePaths: [] })

      expect(result).toBeTruthy()
      expect(result.id).toBeDefined()
      expect(result.text).toBe('Test dump content')
      expect(result.created).toBeDefined()
    })
  })

  describe('write queue serialization (META-02)', () => {
    it('serializes concurrent writes', async () => {
      const dumpereDir = path.join(tempDir, '.dumpere')
      fs.mkdirSync(dumpereDir, { recursive: true })
      fs.writeFileSync(
        path.join(dumpereDir, 'metadata.json'),
        JSON.stringify({ version: '1.0', created: '2024-01-01', dumps: [] })
      )

      const { getVaultState } = await import('./vault-service')
      ;(getVaultState as ReturnType<typeof vi.fn>).mockReturnValue({
        isOpen: true,
        vaultPath: tempDir,
        vaultName: 'test-vault'
      })

      const { readFile } = await import('fs/promises')
      ;(readFile as ReturnType<typeof vi.fn>).mockImplementation(() =>
        Promise.resolve(JSON.stringify({ version: '1.0', created: '2024-01-01', dumps: [] }))
      )

      // Fire concurrent dumps
      const promise1 = createDump({ text: 'dump1', filePaths: [] })
      const promise2 = createDump({ text: 'dump2', filePaths: [] })

      const [result1, result2] = await Promise.all([promise1, promise2])

      // Both should succeed and have different IDs
      expect(result1.id).not.toBe(result2.id)
      // writeFile should be called for each (serialized)
      expect(fs.writeFile).toHaveBeenCalledTimes(2)
    })
  })
})
