import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useVault } from './useVault'
import { VaultState, RecentVault } from './useVault'

// Mock window.electronAPI
const mockGetVaultState = vi.fn()
const mockGetRecentVaults = vi.fn()
const mockOnVaultStateChange = vi.fn()
const mockCreateVault = vi.fn()
const mockOpenVault = vi.fn()
const mockCloseVault = vi.fn()

vi.stubGlobal('window', {
  electronAPI: {
    getVaultState: mockGetVaultState,
    getRecentVaults: mockGetRecentVaults,
    onVaultStateChange: mockOnVaultStateChange,
    createVault: mockCreateVault,
    openVault: mockOpenVault,
    closeVault: mockCloseVault,
  }
})

describe('useVault', () => {
  const closedState: VaultState = { isOpen: false, vaultPath: null, vaultName: null }
  const openState: VaultState = { isOpen: true, vaultPath: '/test/vault', vaultName: 'test-vault' }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetVaultState.mockResolvedValue(closedState)
    mockGetRecentVaults.mockResolvedValue([])
    mockOnVaultStateChange.mockImplementation((cb: (state: VaultState) => void) => {
      // Store callback for later triggering
    })
  })

  it('loads initial vault state on mount', async () => {
    const { result } = renderHook(() => useVault())

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

    const { result } = renderHook(() => useVault())

    await waitFor(() => {
      expect(mockGetRecentVaults).toHaveBeenCalled()
    })

    expect(result.current.recentVaults).toEqual(recentVaults)
  })

  it('createVault updates state and recentVaults on success', async () => {
    mockCreateVault.mockResolvedValueOnce(openState)
    mockGetRecentVaults.mockResolvedValue([{ path: '/test/vault', name: 'test-vault', lastOpened: Date.now() }])

    const { result } = renderHook(() => useVault())

    await act(async () => {
      await result.current.createVault()
    })

    expect(mockCreateVault).toHaveBeenCalled()
    expect(result.current.vaultState.isOpen).toBe(true)
    expect(result.current.vaultState.vaultPath).toBe('/test/vault')
  })

  it('createVault sets error on failure', async () => {
    mockCreateVault.mockRejectedValueOnce(new Error('Failed to create'))

    const { result } = renderHook(() => useVault())

    await act(async () => {
      try {
        await result.current.createVault()
      } catch {}
    })

    expect(result.current.error).toBe('Failed to create')
  })

  it('openVault updates state on success', async () => {
    mockOpenVault.mockResolvedValueOnce(openState)

    const { result } = renderHook(() => useVault())

    await act(async () => {
      await result.current.openVault('/test/vault')
    })

    expect(mockOpenVault).toHaveBeenCalledWith('/test/vault')
    expect(result.current.vaultState.isOpen).toBe(true)
  })

  it('closeVault updates state to closed', async () => {
    mockCloseVault.mockResolvedValueOnce(closedState)

    const { result } = renderHook(() => useVault())

    await act(async () => {
      await result.current.closeVault()
    })

    expect(result.current.vaultState.isOpen).toBe(false)
    expect(result.current.vaultState.vaultPath).toBeNull()
  })

  it('subscribes to vault state changes', async () => {
    renderHook(() => useVault())

    expect(mockOnVaultStateChange).toHaveBeenCalledWith(expect.any(Function))
  })

  it('isLoading is true during vault operations', async () => {
    mockCreateVault.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(openState), 100)))

    const { result } = renderHook(() => useVault())

    expect(result.current.isLoading).toBe(false)

    act(() => {
      result.current.createVault()
    })

    expect(result.current.isLoading).toBe(true)
  })
})
