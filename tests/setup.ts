import { expect, vi } from 'vitest'

expect.extend({
  toBeInTheDocument(received: unknown) {
    const pass = received instanceof Node && document.contains(received)

    return {
      pass,
      message: () =>
        pass
          ? 'expected element not to be present in the document'
          : 'expected element to be present in the document'
    }
  },

  toBeDisabled(received: unknown) {
    const isHtmlElement = received instanceof HTMLElement
    const pass = isHtmlElement && (
      'disabled' in received
        ? Boolean((received as HTMLButtonElement | HTMLInputElement).disabled)
        : received.getAttribute('aria-disabled') === 'true'
    )

    return {
      pass,
      message: () =>
        pass
          ? 'expected element not to be disabled'
          : 'expected element to be disabled'
    }
  },

  toHaveClass(received: unknown, ...classNames: string[]) {
    const pass = received instanceof Element && classNames.every(className => received.classList.contains(className))

    return {
      pass,
      message: () =>
        pass
          ? `expected element not to include classes: ${classNames.join(', ')}`
          : `expected element to include classes: ${classNames.join(', ')}`
    }
  }
})

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
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')

  return {
    ...actual,
    createWriteStream: vi.fn(() => {
      const stream = {
        on: vi.fn((event: string, cb: () => void) => {
          if (event === 'close') setTimeout(cb, 0)
          return stream
        })
      }

      return stream
    })
  }
})
