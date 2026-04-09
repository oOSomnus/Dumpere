import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { mockElectronAPI } from './lib/types'
import type { VaultState } from './hooks/useVault'

describe('App', () => {
  const closedState: VaultState = {
    isOpen: false,
    vaultPath: null,
    vaultName: null,
  }

  const openState: VaultState = {
    isOpen: true,
    vaultPath: '/tmp/test-vault',
    vaultName: 'test-vault',
  }

  beforeEach(() => {
    vi.resetModules()

    let vaultStateChangeHandler: ((state: VaultState) => void) | undefined

    const electronAPI = {
      ...mockElectronAPI,
      getVaultState: vi.fn(async () => closedState),
      getRecentVaults: vi.fn(async () => []),
      onVaultStateChange: vi.fn((callback: (state: VaultState) => void) => {
        vaultStateChangeHandler = callback
      }),
      createVault: vi.fn(async () => {
        vaultStateChangeHandler?.(openState)
        return openState
      }),
      openVault: vi.fn(async () => openState),
      closeVault: vi.fn(async () => closedState),
      getDumps: vi.fn(async () => []),
      getProjects: vi.fn(async () => []),
      getTags: vi.fn(async () => []),
      getDumpOrder: vi.fn(async () => []),
      onThemeChange: vi.fn(),
    }

    window.electronAPI = electronAPI
  })

  it('transitions from welcome screen to vault content without crashing', async () => {
    const { App } = await import('./App')

    render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )

    const heading = await screen.findByRole('heading', { name: 'Dumpere' })
    expect(heading).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Create Vault/i }))

    await waitFor(() => {
      expect(screen.getByText('Vault opened: test-vault')).toBeInTheDocument()
    })

    expect(screen.getByPlaceholderText('Dump something... (Enter to add tags)')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Dumpere' })).not.toBeInTheDocument()
  })

  it('can navigate to summaries and back to dumps', async () => {
    const { App } = await import('./App')

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /Create Vault/i }))

    await screen.findByPlaceholderText('Dump something... (Enter to add tags)')

    fireEvent.click(screen.getByRole('button', { name: /Summaries/i }))

    expect(await screen.findByRole('heading', { name: 'Summaries' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Back to Dumps/i }))

    expect(await screen.findByPlaceholderText('Dump something... (Enter to add tags)')).toBeInTheDocument()
  })
})
