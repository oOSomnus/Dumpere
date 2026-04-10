import { mockElectronAPI, type ElectronAPI } from './types'

export function getElectronAPI(): ElectronAPI {
  return typeof window !== 'undefined' && window.electronAPI
    ? window.electronAPI
    : mockElectronAPI
}
