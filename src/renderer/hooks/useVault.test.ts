import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { VaultState, RecentVault } from '../lib/types'

const mockGetVaultState = vi.fn()
const mockGetRecentVaults = vi.fn()
const mockOnVaultStateChange = vi.fn()
const mockCreateVault = vi.fn()
const mockOpenVault = vi.fn()
const mockCloseVault = vi.fn()

async function renderUseVault() {
  const { useVault } = await import('./useVault')
  return renderHook(() => useVault())
}

describe('useVault', () => {
  const closedState: VaultState = { isOpen: false, vaultPath: null, vaultName: null }
  const openState: VaultState = { isOpen: true, vaultPath: '/test/vault', vaultName: 'test-vault' }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    window.electronAPI = {
      ...(window.electronAPI ?? {}),
      getVaultState: mockGetVaultState,
      getRecentVaults: mockGetRecentVaults,
      onVaultStateChange: mockOnVaultStateChange,
      createVault: mockCreateVault,
      openVault: mockOpenVault,
      closeVault: mockCloseVault,
    } as typeof window.electronAPI

    mockGetVaultState.mockResolvedValue(closedState)
    mockGetRecentVaults.mockResolvedValue([])
    mockOnVaultStateChange.mockImplementation((_cb: (state: VaultState) => void) => {})
  })

  it('loads initial vault state on mount', async () => {
    const { result } = await renderUseVault()

    await waitFor(() => {
      expect(mockGetVaultState).toHaveBeenCalled()
    })

    expect(result.current.vaultState).toEqual(closedState)
  })

  it('loads recent vaults on mount', async () => {
    const recentVaults: RecentVault[] = [
      { path: '/home/user/vault1', name: 'Project 1', lastOpened: Date.now() }
    ]
    mockGetRecentVaults.mockResolvedValueOnce(recentVaults)

    const { result } = await renderUseVault()

    await waitFor(() => {
      expect(mockGetRecentVaults).toHaveBeenCalled()
    })

    expect(result.current.recentVaults).toEqual(recentVaults)
  })

  it('createVault updates state and recentVaults on success', async () => {
    mockCreateVault.mockResolvedValueOnce(openState)
    mockGetRecentVaults.mockResolvedValue([{ path: '/test/vault', name: 'test-vault', lastOpened: Date.now() }])

    const { result } = await renderUseVault()

    await act(async () => {
      await result.current.createVault()
    })

    expect(mockCreateVault).toHaveBeenCalled()
    expect(result.current.vaultState.isOpen).toBe(true)
    expect(result.current.vaultState.vaultPath).toBe('/test/vault')
  })

  it('createVault sets error on failure', async () => {
    mockCreateVault.mockRejectedValueOnce(new Error('Failed to create'))

    const { result } = await renderUseVault()

    await act(async () => {
      try {
        await result.current.createVault()
      } catch {}
    })

    expect(result.current.error).toBe('Failed to create')
  })

  it('openVault updates state on success', async () => {
    mockOpenVault.mockResolvedValueOnce(openState)

    const { result } = await renderUseVault()

    await act(async () => {
      await result.current.openVault('/test/vault')
    })

    expect(mockOpenVault).toHaveBeenCalledWith('/test/vault')
    expect(result.current.vaultState.isOpen).toBe(true)
  })

  it('closeVault updates state to closed', async () => {
    mockCloseVault.mockResolvedValueOnce(closedState)

    const { result } = await renderUseVault()

    await act(async () => {
      await result.current.closeVault()
    })

    expect(result.current.vaultState.isOpen).toBe(false)
    expect(result.current.vaultState.vaultPath).toBeNull()
  })

  it('subscribes to vault state changes', async () => {
    await renderUseVault()

    expect(mockOnVaultStateChange).toHaveBeenCalledWith(expect.any(Function))
  })

  it('isLoading is true during vault operations', async () => {
    mockCreateVault.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(openState), 25))
    )

    const { result } = await renderUseVault()

    expect(result.current.isLoading).toBe(false)

    let createPromise!: Promise<void>
    act(() => {
      createPromise = result.current.createVault()
    })

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      await createPromise
    })
  })
})
