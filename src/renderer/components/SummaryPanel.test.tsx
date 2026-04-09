import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Project, SummaryEntry } from '../lib/types'
import { mockElectronAPI } from '../lib/types'

vi.mock('../hooks/useSummary', () => ({
  useSummary: vi.fn()
}))

vi.mock('../hooks/useWorkpad', () => ({
  useWorkpad: vi.fn()
}))

vi.mock('../lib/utils-time', () => ({
  formatRelativeTime: vi.fn(() => '2 hours ago')
}))

import { SummaryPanel } from './SummaryPanel'
import { useSummary } from '../hooks/useSummary'
import { useWorkpad } from '../hooks/useWorkpad'

describe('SummaryPanel', () => {
  const summary: SummaryEntry = {
    id: 'summary-1',
    type: 'daily',
    projectId: null,
    generatedAt: Date.now(),
    content: '# Summary\n\n- Finished implementation',
    dumpCount: 3
  }

  const projects: Project[] = [
    { id: 'project-1', name: 'Alpha', createdAt: Date.now() }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(mockElectronAPI, 'exportSummary').mockResolvedValue('/tmp/summary.md')

    ;(useSummary as ReturnType<typeof vi.fn>).mockReturnValue({
      currentSummary: summary,
      summaries: [summary],
      isLoading: false,
      error: null,
      generateSummary: vi.fn().mockResolvedValue(undefined),
      clearError: vi.fn(),
      setCurrentSummary: vi.fn()
    })

    ;(useWorkpad as ReturnType<typeof vi.fn>).mockReturnValue({
      workpad: { projectId: null, content: '## Notes', updatedAt: Date.now() },
      content: '## Notes',
      setContent: vi.fn(),
      isLoading: false,
      isSaving: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined),
      saveNow: vi.fn().mockResolvedValue({ projectId: null, content: '## Notes', updatedAt: Date.now() })
    })
  })

  it('renders the workpad editor and current summary', () => {
    render(<SummaryPanel projects={projects} activeProjectId={null} />)

    expect(screen.getByText('Project Workpad')).toBeInTheDocument()
    expect(screen.getByDisplayValue('## Notes')).toBeInTheDocument()
    expect(screen.getByText('Finished implementation')).toBeInTheDocument()
  })

  it('saves the workpad before generating a summary and refreshes afterward', async () => {
    const saveNow = vi.fn().mockResolvedValue({ projectId: null, content: '## Notes', updatedAt: Date.now() })
    const refresh = vi.fn().mockResolvedValue(undefined)
    const generateSummary = vi.fn().mockResolvedValue(undefined)

    ;(useSummary as ReturnType<typeof vi.fn>).mockReturnValue({
      currentSummary: summary,
      summaries: [summary],
      isLoading: false,
      error: null,
      generateSummary,
      clearError: vi.fn(),
      setCurrentSummary: vi.fn()
    })

    ;(useWorkpad as ReturnType<typeof vi.fn>).mockReturnValue({
      workpad: { projectId: null, content: '## Notes', updatedAt: Date.now() },
      content: '## Notes',
      setContent: vi.fn(),
      isLoading: false,
      isSaving: false,
      error: null,
      refresh,
      saveNow
    })

    render(<SummaryPanel projects={projects} activeProjectId={null} />)

    fireEvent.click(screen.getByText('Generate Summary'))

    await waitFor(() => {
      expect(saveNow).toHaveBeenCalled()
      expect(generateSummary).toHaveBeenCalledWith('daily', null)
      expect(refresh).toHaveBeenCalled()
    })
  })

  it('exports the current summary', async () => {
    render(<SummaryPanel projects={projects} activeProjectId={null} />)

    fireEvent.click(screen.getByText('Export'))

    await waitFor(() => {
      expect(mockElectronAPI.exportSummary).toHaveBeenCalledWith('summary-1')
    })
  })

  it('switches the workpad into preview mode', () => {
    render(<SummaryPanel projects={projects} activeProjectId={null} />)

    fireEvent.click(screen.getByText('Preview'))

    expect(screen.getByText('Notes')).toBeInTheDocument()
  })
})
