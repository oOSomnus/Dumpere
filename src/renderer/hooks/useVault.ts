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

const api = window.electronAPI

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