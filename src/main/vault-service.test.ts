import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fs, path, os } from 'vitest/node'
import { createVault, openVault, getVaultState, validateVaultRoot } from './vault-service'

// Mock Electron modules
vi.mock('electron', () => ({
  dialog: {
    showOpenDialog: vi.fn(),
  },
  app: {
    getPath: vi.fn(() => '/tmp/test-userData'),
  },
}))

// Mock electron-log
vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

// Mock electron-store
vi.mock('./store', () => ({
  store: {
    get: vi.fn(() => []),
    set: vi.fn(),
  }
}))

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
  realpath: vi.fn((p) => Promise.resolve(p)),
}))

describe('vault-service', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-test-'))
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('createVault', () => {
    it('creates .dumpere structure with metadata.json', async () => {
      const { dialog } = await import('electron')
      dialog.showOpenDialog.mockResolvedValueOnce({
        canceled: false,
        filePaths: [tempDir]
      })

      const state = await createVault()

      expect(state.isOpen).toBe(true)
      expect(state.vaultPath).toBe(tempDir)
      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('.dumpere'),
        { recursive: true }
      )
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('metadata.json'),
        expect.any(String)
      )
    })

    it('rejects non-empty directories', async () => {
      const { dialog } = await import('electron')
      // Create a file in the directory
      fs.writeFileSync(path.join(tempDir, 'somefile.txt'), 'content')
      dialog.showOpenDialog.mockResolvedValueOnce({
        canceled: false,
        filePaths: [tempDir]
      })

      await expect(createVault()).rejects.toThrow('empty folder')
    })

    it('allows README.md and .gitignore', async () => {
      const { dialog } = await import('electron')
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test')
      dialog.showOpenDialog.mockResolvedValueOnce({
        canceled: false,
        filePaths: [tempDir]
      })

      const state = await createVault()
      expect(state.isOpen).toBe(true)
    })
  })

  describe('openVault', () => {
    it('opens valid vault with .dumpere marker', async () => {
      // Setup: create .dumpere structure
      const dumpereDir = path.join(tempDir, '.dumpere')
      fs.mkdirSync(dumpereDir)
      fs.mkdirSync(path.join(dumpereDir, 'images'))
      fs.mkdirSync(path.join(dumpereDir, 'videos'))
      fs.mkdirSync(path.join(dumpereDir, 'audio'))
      fs.mkdirSync(path.join(dumpereDir, 'files'))
      fs.writeFileSync(
        path.join(dumpereDir, 'metadata.json'),
        JSON.stringify({ version: '1.0', created: new Date().toISOString(), dumps: [] })
      )

      const state = await openVault(tempDir)

      expect(state.isOpen).toBe(true)
      expect(state.vaultPath).toBe(tempDir)
    })

    it('rejects directory without .dumpere marker', async () => {
      await expect(openVault(tempDir)).rejects.toThrow('not a Dumpere vault')
    })

    it('rejects vault with corrupted metadata.json', async () => {
      const dumpereDir = path.join(tempDir, '.dumpere')
      fs.mkdirSync(dumpereDir)
      fs.writeFileSync(path.join(dumpereDir, 'metadata.json'), 'not valid json')

      await expect(openVault(tempDir)).rejects.toThrow('corrupted')
    })
  })

  describe('validateVaultRoot', () => {
    it('accepts valid paths', () => {
      expect(validateVaultRoot('/home/user/vault')).toBe(true)
      expect(validateVaultRoot('/home/user/my-project')).toBe(true)
    })

    it('rejects paths with ..', () => {
      expect(validateVaultRoot('/home/user/../etc/passwd')).toBe(false)
      expect(validateVaultRoot('/home/user/vault/../../etc')).toBe(false)
    })

    it('handles backslash normalization', () => {
      expect(validateVaultRoot('C:\\Users\\..\\etc')).toBe(false)
    })
  })

  describe('getVaultState', () => {
    it('returns initial closed state', () => {
      const state = getVaultState()
      expect(state.isOpen).toBe(false)
      expect(state.vaultPath).toBeNull()
      expect(state.vaultName).toBeNull()
    })
  })
})
