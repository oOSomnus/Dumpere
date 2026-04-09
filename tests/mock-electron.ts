import { vi } from 'vitest'

export const mockDialog = {
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
}

export const mockApp = {
  getPath: vi.fn(() => '/tmp/test-userData'),
  requestSingleInstanceLock: vi.fn(() => true),
  getName: vi.fn(() => 'Dumpere'),
}

export const mockIpcMain = {
  handle: vi.fn(),
  on: vi.fn(),
}

export const mockBrowserWindow = {
  fromWebContents: vi.fn(() => ({
    isMaximized: vi.fn(() => false),
    webContents: { send: vi.fn() }
  })),
  getAllWindows: vi.fn(() => []),
}

export const mockStore = {
  get: vi.fn((key: string, defaultValue: unknown) => defaultValue),
  set: vi.fn(),
}

// Helper to reset all mocks
export function resetElectronMocks(): void {
  mockDialog.showOpenDialog.mockReset()
  mockDialog.showSaveDialog.mockReset()
  mockApp.getPath.mockReset()
  mockApp.requestSingleInstanceLock.mockReset()
  mockIpcMain.handle.mockReset()
  mockIpcMain.on.mockReset()
  mockBrowserWindow.fromWebContents.mockReset()
  mockBrowserWindow.getAllWindows.mockReset()
  mockStore.get.mockReset()
  mockStore.set.mockReset()
}
