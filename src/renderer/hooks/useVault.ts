import { useState, useEffect, useCallback } from 'react'
import type { RecentVault, VaultState } from '@/shared/types'
import { getElectronAPI } from '../lib/electron-api'

export function useVault() {
  const api = getElectronAPI()
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
        const state = await api.vault.getState()
        setVaultState(state)
        const recent = await api.vault.getRecent()
        setRecentVaults(recent)
      } catch (err) {
        console.error('Failed to load vault state:', err)
      }
    }
    loadInitialState()

    // Subscribe to vault state changes
    return api.vault.onStateChange((state: VaultState) => {
      setVaultState(state)
    })
  }, [])

  const createVault = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const state = await api.vault.create()
      setVaultState(state)
      const recent = await api.vault.getRecent()
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
      const state = await api.vault.open(vaultPath)
      setVaultState(state)
      const recent = await api.vault.getRecent()
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
      const state = await api.vault.close()
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
