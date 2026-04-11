import { dialog } from 'electron'
import { mkdir, readdir } from 'fs/promises'
import { basename, join } from 'path'
import log from 'electron-log'
import { store } from './store'
import { createEmptyMetadata, readMetadata, writeMetadata } from './metadata-service'
import type { RecentVault, VaultState } from '@/shared/types'

const DUMPERE_DIR = '.dumpere'
const ALLOWED_EXTRAS = ['README.md', '.gitignore']
const ATTACHMENT_DIRS = ['images', 'videos', 'audio', 'files', 'workspaces']

let vaultState: VaultState = { isOpen: false, vaultPath: null, vaultName: null }
const stateChangeCallbacks = new Set<(state: VaultState) => void>()

export function onVaultStateChange(callback: (state: VaultState) => void): () => void {
  stateChangeCallbacks.add(callback)
  return () => {
    stateChangeCallbacks.delete(callback)
  }
}

function notifyStateChange(): void {
  stateChangeCallbacks.forEach((callback) => callback(vaultState))
}

export function getVaultState(): VaultState {
  return vaultState
}

export function validateVaultRoot(vaultPath: string): boolean {
  const normalized = vaultPath.replace(/\\/g, '/')
  return !normalized.includes('..')
}

async function ensureVaultStructure(vaultPath: string): Promise<void> {
  const root = join(vaultPath, DUMPERE_DIR)
  await mkdir(root, { recursive: true })

  await Promise.all(ATTACHMENT_DIRS.map((directory) => (
    mkdir(join(root, directory), { recursive: true })
  )))
}

function updateVaultState(vaultPath: string): VaultState {
  vaultState = {
    isOpen: true,
    vaultPath,
    vaultName: basename(vaultPath)
  }

  addToRecentVaults(vaultPath, vaultState.vaultName)
  notifyStateChange()
  return vaultState
}

export async function createVault(): Promise<VaultState> {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  if (result.canceled || !result.filePaths[0]) {
    return vaultState
  }

  const vaultPath = result.filePaths[0]
  if (!validateVaultRoot(vaultPath)) {
    throw new Error('Invalid vault path')
  }

  const entries = await readdir(vaultPath)
  const unexpected = entries.filter((entry) => !ALLOWED_EXTRAS.includes(entry))
  if (unexpected.length > 0) {
    throw new Error('Choose an empty folder to create a vault')
  }

  await ensureVaultStructure(vaultPath)
  await writeMetadata(vaultPath, createEmptyMetadata())

  log.info(`Created vault: ${vaultPath}`)
  return updateVaultState(vaultPath)
}

export async function openVault(vaultPath?: string): Promise<VaultState> {
  let selectedPath = vaultPath

  if (!selectedPath) {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (result.canceled || !result.filePaths[0]) {
      return vaultState
    }
    selectedPath = result.filePaths[0]
  }

  if (!validateVaultRoot(selectedPath)) {
    throw new Error('Invalid vault path')
  }

  const entries = await readdir(selectedPath)
  if (!entries.includes(DUMPERE_DIR)) {
    throw new Error('This folder is not a Dumpere vault')
  }

  await readMetadata(selectedPath)
  await ensureVaultStructure(selectedPath)

  log.info(`Opened vault: ${selectedPath}`)
  return updateVaultState(selectedPath)
}

export async function closeVault(): Promise<VaultState> {
  vaultState = {
    isOpen: false,
    vaultPath: null,
    vaultName: null
  }

  notifyStateChange()
  return vaultState
}

function addToRecentVaults(path: string, name: string | null): void {
  if (!name) {
    return
  }

  const MAX_RECENT = 5
  const recentVaults = store.get('recentVaults', [])
  const nextVaults: RecentVault[] = recentVaults.filter((vault) => vault.path !== path)

  nextVaults.unshift({
    path,
    name,
    lastOpened: Date.now()
  })

  store.set('recentVaults', nextVaults.slice(0, MAX_RECENT))
}
