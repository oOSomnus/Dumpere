import type { ElectronAPI } from './types'
import { mockElectronAPI } from './mock-electron-api'

export function getElectronAPI(): ElectronAPI {
  return typeof window !== 'undefined' && window.electronAPI
    ? window.electronAPI
    : mockElectronAPI
}
