import { vi } from 'vitest'

// Mock electron-log globally - all main process modules use this
vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

// Mock fs/promises for file operations
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  rename: vi.fn(),
  unlink: vi.fn(),
  readdir: vi.fn(),
  mkdir: vi.fn(),
  copyFile: vi.fn(),
  stat: vi.fn(),
  realpath: vi.fn(),
}))

// Mock fs (for createWriteStream)
vi.mock('fs', () => ({
  ...vi.importActual('fs'),
  createWriteStream: vi.fn(() => ({
    on: vi.fn((event, cb) => {
      if (event === 'close') setTimeout(cb, 0)
      return this
    })
  }))
}))
