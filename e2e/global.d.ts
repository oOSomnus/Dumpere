import type { ElectronAPI } from '../src/shared/types'

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
