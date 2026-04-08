import { useState, useEffect, useCallback } from 'react'

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

interface ElectronAPI {
  getVaultState: () => Promise<VaultState>
  getRecentVaults: () => Promise<RecentVault[]>
  onVaultStateChange: (callback: (state: VaultState) => void) => void
  createVault: () => Promise<VaultState>
  openVault: (vaultPath?: string) => Promise<VaultState>
  closeVault: () => Promise<VaultState>
}

const fallbackApi: ElectronAPI = {
  getVaultState: async () => ({ isOpen: false, vaultPath: null, vaultName: null }),
  getRecentVaults: async () => [],
  onVaultStateChange: () => {},
  createVault: async () => { throw new Error('Not available in browser') },
  openVault: async () => { throw new Error('Not available in browser') },
  closeVault: async () => { throw new Error('Not available in browser') },
}

const api = (typeof window !== 'undefined' && window.electronAPI) ? window.electronAPI as ElectronAPI : fallbackApi

export function useVault() {
  const [vaultState, setVaultState] = useState<VaultState>({
    isOpen: false,
    vaultPath: null,
    vaultName: null
  })
  const [recentVaults, setRecentVaults] = useState<RecentVault[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load initial vault state and recent vaults
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const state = await api.getVaultState()
        setVaultState(state)
        const recent = await api.getRecentVaults()
        setRecentVaults(recent)
      } catch (err) {
        console.error('Failed to load vault state:', err)
      }
    }
    loadInitialState()

    // Subscribe to vault state changes
    api.onVaultStateChange((state: VaultState) => {
      setVaultState(state)
    })
  }, [])

  const createVault = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const state = await api.createVault()
      setVaultState(state)
      const recent = await api.getRecentVaults()
      setRecentVaults(recent)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create vault'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const openVault = useCallback(async (vaultPath?: string): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const state = await api.openVault(vaultPath)
      setVaultState(state)
      const recent = await api.getRecentVaults()
      setRecentVaults(recent)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open vault'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const closeVault = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const state = await api.closeVault()
      setVaultState(state)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to close vault'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    vaultState,
    recentVaults,
    isLoading,
    error,
    createVault,
    openVault,
    closeVault
  }
}