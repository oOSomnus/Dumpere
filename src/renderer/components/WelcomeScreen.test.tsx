import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WelcomeScreen } from './WelcomeScreen'
import { VaultState, RecentVault } from '../hooks/useVault'

// Mock window.electronAPI
const mockCreateVault = vi.fn()
const mockOpenVault = vi.fn()

describe('WelcomeScreen', () => {
  const defaultVaultState: VaultState = {
    isOpen: false,
    vaultPath: null,
    vaultName: null
  }

  const defaultProps = {
    vaultState: defaultVaultState,
    recentVaults: [] as RecentVault[],
    isLoading: false,
    error: null as string | null,
    onCreateVault: vi.fn(),
    onOpenVault: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI = {
      ...(window.electronAPI ?? {}),
      createVault: mockCreateVault,
      openVault: mockOpenVault,
      getVaultState: vi.fn(() => Promise.resolve({ isOpen: false, vaultPath: null, vaultName: null })),
      getRecentVaults: vi.fn(() => Promise.resolve([])),
      onVaultStateChange: vi.fn(),
    } as typeof window.electronAPI
  })

  it('renders Dumpere heading', () => {
    render(<WelcomeScreen {...defaultProps} />)
    expect(screen.getByRole('heading', { name: 'Dumpere' })).toBeInTheDocument()
  })

  it('renders Create Vault button', () => {
    render(<WelcomeScreen {...defaultProps} />)
    expect(screen.getByRole('button', { name: /Create Vault/i })).toBeInTheDocument()
  })

  it('renders Open Vault button', () => {
    render(<WelcomeScreen {...defaultProps} />)
    expect(screen.getByRole('button', { name: /Open Vault/i })).toBeInTheDocument()
  })

  it('renders tagline text', () => {
    render(<WelcomeScreen {...defaultProps} />)
    expect(screen.getByText('Quick work completion tracking')).toBeInTheDocument()
  })

  it('calls onCreateVault when Create Vault is clicked', async () => {
    render(<WelcomeScreen {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Create Vault/i }))
    expect(defaultProps.onCreateVault).toHaveBeenCalled()
  })

  it('calls onOpenVault when Open Vault is clicked', async () => {
    render(<WelcomeScreen {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Open Vault/i }))
    expect(defaultProps.onOpenVault).toHaveBeenCalled()
  })

  it('renders recent vaults when provided', () => {
    const recentVaults: RecentVault[] = [
      { path: '/home/user/vault1', name: 'Project 1', lastOpened: Date.now() - 86400000 },
      { path: '/home/user/vault2', name: 'Project 2', lastOpened: Date.now() - 172800000 },
    ]
    render(<WelcomeScreen {...defaultProps} recentVaults={recentVaults} />)
    expect(screen.getByText('Recent Vaults')).toBeInTheDocument()
    expect(screen.getByText('Project 1')).toBeInTheDocument()
    expect(screen.getByText('Project 2')).toBeInTheDocument()
  })

  it('renders error message when error prop is set', () => {
    render(<WelcomeScreen {...defaultProps} error="Failed to create vault" />)
    expect(screen.getByText('Failed to create vault')).toBeInTheDocument()
  })

  it('shows loading text when creating vault', () => {
    const onCreateVault = vi.fn(() => new Promise<void>(() => {}))
    render(<WelcomeScreen {...defaultProps} onCreateVault={onCreateVault} />)

    fireEvent.click(screen.getByRole('button', { name: /Create Vault/i }))

    expect(screen.getByText('Creating...')).toBeInTheDocument()
  })

  it('shows loading text when opening vault', () => {
    const onOpenVault = vi.fn(() => new Promise<void>(() => {}))
    render(<WelcomeScreen {...defaultProps} onOpenVault={onOpenVault} />)

    fireEvent.click(screen.getByRole('button', { name: /Open Vault/i }))

    expect(screen.getByText('Opening...')).toBeInTheDocument()
  })

  it('disables buttons when loading', () => {
    render(<WelcomeScreen {...defaultProps} isLoading={true} />)
    expect(screen.getByRole('button', { name: /Create Vault/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Open Vault/i })).toBeDisabled()
  })
})
