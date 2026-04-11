import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { ExpandedCard } from './ExpandedCard'
import type { DumpEntry } from '../lib/types'
import { renderWithPrompt } from '../test-utils'

vi.mock('../hooks/useFileUrl', () => ({
  useFileUrl: vi.fn((storedPath: string) => `file://${storedPath}`)
}))

describe('ExpandedCard', () => {
  const dump: DumpEntry = {
    id: 'dump-1',
    text: 'Test dump',
    files: [
      {
        id: 'file-1',
        originalName: 'report.pdf',
        storedPath: 'dumps/report.pdf',
        mimeType: 'application/pdf',
        size: 2048
      },
      {
        id: 'file-2',
        originalName: 'photo.png',
        storedPath: 'dumps/photo.png',
        mimeType: 'image/png',
        size: 2048
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    projectId: null,
    tags: []
  }

  beforeEach(() => {
    window.electronAPI = {
      ...window.electronAPI,
      files: {
        ...window.electronAPI?.files,
        openFile: vi.fn().mockResolvedValue(undefined)
      },
      ui: {
        ...window.electronAPI?.ui,
        copyToClipboard: vi.fn().mockResolvedValue(undefined)
      }
    }
  })

  it('opens non-media attachments with the system default app', async () => {
    renderWithPrompt(
      <ExpandedCard
        dump={dump}
        onClose={vi.fn()}
        projects={[]}
        tags={[]}
        onProjectChange={vi.fn()}
        onTagsChange={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open report.pdf' }))

    await waitFor(() => {
      expect(window.electronAPI.files.openFile).toHaveBeenCalledWith('dumps/report.pdf')
    })
  })

  it('opens images with the system default app when clicked', async () => {
    renderWithPrompt(
      <ExpandedCard
        dump={dump}
        onClose={vi.fn()}
        projects={[]}
        tags={[]}
        onProjectChange={vi.fn()}
        onTagsChange={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open photo.png' }))

    await waitFor(() => {
      expect(window.electronAPI.files.openFile).toHaveBeenCalledWith('dumps/photo.png')
    })
  })

  it('keeps video and audio attachments inline', () => {
    const mediaDump: DumpEntry = {
      ...dump,
      files: [
        {
          id: 'file-3',
          originalName: 'clip.mp4',
          storedPath: 'dumps/clip.mp4',
          mimeType: 'video/mp4',
          size: 2048
        },
        {
          id: 'file-4',
          originalName: 'note.mp3',
          storedPath: 'dumps/note.mp3',
          mimeType: 'audio/mpeg',
          size: 2048
        }
      ]
    }

    renderWithPrompt(
      <ExpandedCard
        dump={mediaDump}
        onClose={vi.fn()}
        projects={[]}
        tags={[]}
        onProjectChange={vi.fn()}
        onTagsChange={vi.fn()}
      />
    )

    expect(document.querySelector('video')).toBeInTheDocument()
    expect(document.querySelector('audio')).toBeInTheDocument()
  })

  it('does not show unassigned in the project selector trigger', () => {
    renderWithPrompt(
      <ExpandedCard
        dump={dump}
        onClose={vi.fn()}
        projects={[{ id: 'project-1', name: 'Inbox', createdAt: 1 }]}
        tags={[]}
        onProjectChange={vi.fn()}
        onTagsChange={vi.fn()}
      />
    )

    expect(screen.getByRole('combobox').textContent).toContain('No Project')
    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument()
  })
})
