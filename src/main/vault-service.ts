import { dialog, app } from 'electron'
import { readdir, mkdir, writeFile, readFile, realpath } from 'fs/promises'
import { join, basename } from 'path'
import log from 'electron-log'
import { store } from './store'

export interface VaultState {
  isOpen: boolean
  vaultPath: string | null
  vaultName: string | null
}

export interface RecentVault {
  path: string
  name: string
  lastOpened: number
}

// In-memory vault state (reset on app restart per single-instance design)
let vaultState: VaultState = { isOpen: false, vaultPath: null, vaultName: null }
let stateChangeCallbacks: Array<(state: VaultState) => void> = []

const DUMPERE_DIR = '.dumpere'
const METADATA_FILE = 'metadata.json'
const ALLOWED_EXTRAS = ['README.md', '.gitignore']

export function onVaultStateChange(callback: (state: VaultState) => void): void {
  stateChangeCallbacks.push(callback)
}

function notifyStateChange(): void {
  for (const cb of stateChangeCallbacks) {
    cb(vaultState)
  }
}

export function getVaultState(): VaultState {
  return vaultState
}

async function resolveVaultPath(userPath: string): Promise<string> {
  // D-05: Use fs.realpath() to resolve symlinks before any vault path operations
  return await realpath(userPath)
}

function validateVaultRoot(vaultPath: string): boolean {
  // Before any file operation, verify resolved path doesn't contain '..' after normalization
  const normalized = vaultPath.replace(/\\/g, '/')
  if (normalized.includes('..')) return false
  return true
}

export async function createVault(): Promise<VaultState> {
  log.info('createVault: showing directory picker')

  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    dontAddToRecent: true  // D-07
  })

  if (result.canceled || !result.filePaths[0]) {
    log.info('createVault: cancelled by user')
    return vaultState
  }

  const userPath = result.filePaths[0]
  const vaultPath = await resolveVaultPath(userPath)

  // Validate path security
  if (!validateVaultRoot(vaultPath)) {
    throw new Error('Invalid vault path')
  }

  // Validate directory is empty (allow README.md or .gitignore)
  const entries = await readdir(vaultPath)
  const unexpected = entries.filter(e => !ALLOWED_EXTRAS.includes(e))
  if (unexpected.length > 0) {
    throw new Error('Choose an empty folder to create a vault')
  }

  // Create .dumpere/ marker directory
  const markerDir = join(vaultPath, DUMPERE_DIR)
  await mkdir(markerDir, { recursive: true })

  // Create type subdirectories
  await mkdir(join(markerDir, 'images'), { recursive: true })
  await mkdir(join(markerDir, 'videos'), { recursive: true })
  await mkdir(join(markerDir, 'audio'), { recursive: true })
  await mkdir(join(markerDir, 'files'), { recursive: true })

  // Create metadata.json with version + empty dumps array
  const metadata = {
    version: '1.0',
    created: new Date().toISOString(),
    dumps: []
  }
  await writeFile(join(markerDir, METADATA_FILE), JSON.stringify(metadata, null, 2))

  // Update state
  vaultState = {
    isOpen: true,
    vaultPath,
    vaultName: basename(vaultPath)
  }

  // Add to recent vaults (APP-01, D-08)
  addToRecentVaults(vaultPath, vaultState.vaultName!)

  log.info(`createVault: success — ${vaultPath}`)
  notifyStateChange()
  return vaultState
}

export async function openVault(vaultPath?: string): Promise<VaultState> {
  log.info('openVault: showing directory picker')

  let selectedPath = vaultPath

  if (!selectedPath) {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      dontAddToRecent: true  // D-07
    })

    if (result.canceled || !result.filePaths[0]) {
      log.info('openVault: cancelled by user')
      return vaultState
    }
    selectedPath = result.filePaths[0]
  }

  const resolvedPath = await resolveVaultPath(selectedPath)

  // Validate path security
  if (!validateVaultRoot(resolvedPath)) {
    throw new Error('Invalid vault path')
  }

  // Validate .dumpere/ marker exists
  const markerDir = join(resolvedPath, DUMPERE_DIR)
  let markerExists = false
  try {
    const entries = await readdir(resolvedPath)
    markerExists = entries.includes(DUMPERE_DIR)
  } catch {
    markerExists = false
  }

  if (!markerExists) {
    throw new Error('This folder is not a Dumpere vault')
  }

  // Validate metadata.json is valid JSON
  const metadataPath = join(markerDir, METADATA_FILE)
  try {
    const content = await readFile(metadataPath, 'utf-8')
    JSON.parse(content)  // Validate it parses
  } catch {
    throw new Error('Vault metadata is corrupted')
  }

  // Update state
  vaultState = {
    isOpen: true,
    vaultPath: resolvedPath,
    vaultName: basename(resolvedPath)
  }

  // Add to recent vaults (APP-01, D-08)
  addToRecentVaults(resolvedPath, vaultState.vaultName!)

  log.info(`openVault: success — ${resolvedPath}`)
  notifyStateChange()
  return vaultState
}

function addToRecentVaults(path: string, name: string): void {
  const MAX_RECENT = 5
  const recentVaults: RecentVault[] = store.get('recentVaults', [])

  // Remove if already exists
  const filtered = recentVaults.filter(r => r.path !== path)

  // Add to front
  filtered.unshift({ path, name, lastOpened: Date.now() })

  // Trim to max 5
  store.set('recentVaults', filtered.slice(0, MAX_RECENT))
  store.set('currentVault', { path, name })
}
