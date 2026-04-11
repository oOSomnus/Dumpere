import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { mockElectronAPI, type VaultState } from './lib/types'

describe('App', () => {
  let mockOnThemeChange: ReturnType<typeof vi.fn>

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
    mockOnThemeChange = vi.fn(() => vi.fn())

    let vaultStateChangeHandler: ((state: VaultState) => void) | undefined

    const electronAPI = {
      ...mockElectronAPI,
      vault: {
        ...mockElectronAPI.vault,
        getState: vi.fn(async () => closedState),
        getRecent: vi.fn(async () => []),
        onStateChange: vi.fn((callback: (state: VaultState) => void) => {
          vaultStateChangeHandler = callback
          return () => {}
        }),
        create: vi.fn(async () => {
          vaultStateChangeHandler?.(openState)
          return openState
        }),
        open: vi.fn(async () => openState),
        close: vi.fn(async () => closedState)
      },
      data: {
        ...mockElectronAPI.data,
        getDumps: vi.fn(async () => []),
        getProjects: vi.fn(async () => []),
        getTags: vi.fn(async () => []),
        getSummaries: vi.fn(async () => []),
        generateSummary: vi.fn(async () => null)
      },
      workspace: {
        ...mockElectronAPI.workspace,
        getTree: vi.fn(async () => [{ type: 'note' as const, name: 'index.md', path: 'index.md' }]),
        createFolder: vi.fn(async () => ({ type: 'folder' as const, name: 'docs', path: 'docs', children: [] })),
        createNote: vi.fn(async () => ({ projectId: 'project-1', path: 'index.md', content: '', updatedAt: Date.now() })),
        readNote: vi.fn(async () => ({ projectId: 'project-1', path: 'index.md', content: '', updatedAt: Date.now() })),
        updateNote: vi.fn(async (_projectId: string, notePath: string, content: string) => ({ projectId: 'project-1', path: notePath, content, updatedAt: Date.now() })),
        renameEntry: vi.fn(async (_projectId: string, path: string) => ({ path })),
        deleteEntry: vi.fn(async () => {})
      },
      ui: {
        ...mockElectronAPI.ui,
        onThemeChange: mockOnThemeChange
      }
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

  it('can return to the vault picker from the main app', async () => {
    const { App } = await import('./App')

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /Create Vault/i }))
    await screen.findByText('Vault opened: test-vault')

    fireEvent.click(screen.getByRole('button', { name: /Back to Vaults/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create Vault/i })).toBeInTheDocument()
    })
  })

  it('can open settings without crashing', async () => {
    const { App } = await import('./App')

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /Create Vault/i }))
    await screen.findByText('Vault opened: test-vault')

    fireEvent.click(screen.getByText('Settings'))

    expect(await screen.findByRole('heading', { name: 'Summary Settings' })).toBeInTheDocument()
  })

  it('does not register an extra theme listener when opening settings', async () => {
    const { App } = await import('./App')

    render(<App />)

    await waitFor(() => {
      expect(mockOnThemeChange).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(await screen.findByRole('button', { name: /Create Vault/i }))
    await screen.findByText('Vault opened: test-vault')

    fireEvent.click(screen.getByText('Settings'))

    expect(await screen.findByRole('heading', { name: 'Summary Settings' })).toBeInTheDocument()
    expect(mockOnThemeChange).toHaveBeenCalledTimes(1)
  })
})
