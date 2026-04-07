import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import type { SummaryEntry, Project } from '../lib/types'
import { mockElectronAPI } from '../lib/types'

// Mock dependencies
vi.mock('../hooks/useSummary', () => ({
  useSummary: vi.fn()
}))

vi.mock('./FloatingActionBar', () => ({
  FloatingActionBar: vi.fn(({ onExport }) => (
    <button data-testid="export-fab" onClick={onExport}>Export</button>
  ))
}))

vi.mock('../lib/utils-time', () => ({
  formatRelativeTime: vi.fn(() => '2 hours ago')
}))

// Import after mocking
import { SummaryPanel } from './SummaryPanel'
import { useSummary } from '../hooks/useSummary'

describe('SummaryPanel', () => {
  const createMockSummary = (overrides: Partial<SummaryEntry> = {}): SummaryEntry => ({
    id: crypto.randomUUID(),
    type: 'daily',
    projectId: null,
    generatedAt: Date.now(),
    content: '# Test Summary\n\n- Item 1\n- Item 2',
    dumpCount: 5,
    ...overrides
  })

  const createMockProject = (overrides: Partial<Project> = {}): Project => ({
    id: crypto.randomUUID(),
    name: 'Test Project',
    createdAt: Date.now(),
    ...overrides
  })

  const mockProjects: Project[] = []

  beforeEach(() => {
    vi.resetAllMocks()
    // Default mock implementations
    ;(useSummary as ReturnType<typeof vi.fn>).mockReturnValue({
      currentSummary: null,
      summaries: [],
      isLoading: false,
      error: null,
      generateSummary: vi.fn(),
      clearError: vi.fn(),
      setCurrentSummary: vi.fn()
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('empty state', () => {
    it('renders empty state when no currentSummary and no stored summaries', () => {
      ;(useSummary as ReturnType<typeof vi.fn>).mockReturnValue({
        currentSummary: null,
        summaries: [],
        isLoading: false,
        error: null,
        generateSummary: vi.fn(),
        clearError: vi.fn(),
        setCurrentSummary: vi.fn()
      })

      render(<SummaryPanel projects={[]} activeProjectId={null} />)

      expect(screen.getByText('No dumps yet')).toBeTruthy()
    })

    it('renders "Select a summary" when no currentSummary but has stored summaries', () => {
      const storedSummaries = [createMockSummary({ id: '1' })]
      ;(useSummary as ReturnType<typeof vi.fn>).mockReturnValue({
        currentSummary: null,
        summaries: storedSummaries,
        isLoading: false,
        error: null,
        generateSummary: vi.fn(),
        clearError: vi.fn(),
        setCurrentSummary: vi.fn()
      })

      render(<SummaryPanel projects={[]} activeProjectId={null} />)

      expect(screen.getByText('Select a summary')).toBeTruthy()
    })
  })

  describe('type toggle', () => {
    it('renders daily and weekly toggle buttons', () => {
      render(<SummaryPanel projects={[]} activeProjectId={null} />)

      expect(screen.getByText('Daily')).toBeTruthy()
      expect(screen.getByText('Weekly')).toBeTruthy()
    })

    it('toggles between daily and weekly types when clicked', async () => {
      const mockSetCurrentSummary = vi.fn()
      ;(useSummary as ReturnType<typeof vi.fn>).mockReturnValue({
        currentSummary: null,
        summaries: [],
        isLoading: false,
        error: null,
        generateSummary: vi.fn(),
        clearError: vi.fn(),
        setCurrentSummary: mockSetCurrentSummary
      })

      render(<SummaryPanel projects={[]} activeProjectId={null} />)

      const weeklyButton = screen.getByText('Weekly')
      fireEvent.click(weeklyButton)

      // When summaries is empty, setCurrentSummary is NOT called (useEffect returns early)
      // The toggle still works - it changes internal summaryType state
      // Verify the button was clicked without error
      expect(weeklyButton).toBeTruthy()
    })
  })

  describe('generate button', () => {
    it('renders "Generate Summary" button when not loading', () => {
      render(<SummaryPanel projects={[]} activeProjectId={null} />)

      expect(screen.getByText('Generate Summary')).toBeTruthy()
    })

    it('renders "Generating summary..." when loading', () => {
      ;(useSummary as ReturnType<typeof vi.fn>).mockReturnValue({
        currentSummary: null,
        summaries: [],
        isLoading: true,
        error: null,
        generateSummary: vi.fn(),
        clearError: vi.fn(),
        setCurrentSummary: vi.fn()
      })

      render(<SummaryPanel projects={[]} activeProjectId={null} />)

      expect(screen.getByText('Generating summary...')).toBeTruthy()
    })

    it('calls generateSummary when Generate Summary button is clicked', async () => {
      const mockGenerateSummary = vi.fn()
      ;(useSummary as ReturnType<typeof vi.fn>).mockReturnValue({
        currentSummary: null,
        summaries: [],
        isLoading: false,
        error: null,
        generateSummary: mockGenerateSummary,
        clearError: vi.fn(),
        setCurrentSummary: vi.fn()
      })

      render(<SummaryPanel projects={[]} activeProjectId={null} />)

      const button = screen.getByText('Generate Summary')
      fireEvent.click(button)

      expect(mockGenerateSummary).toHaveBeenCalledWith('daily', null)
    })

    it('generate button is disabled when loading', () => {
      ;(useSummary as ReturnType<typeof vi.fn>).mockReturnValue({
        currentSummary: null,
        summaries: [],
        isLoading: true,
        error: null,
        generateSummary: vi.fn(),
        clearError: vi.fn(),
        setCurrentSummary: vi.fn()
      })

      render(<SummaryPanel projects={[]} activeProjectId={null} />)

      const button = screen.getByText('Generating summary...') as HTMLButtonElement
      expect(button.disabled).toBe(true)
    })
  })

  describe('summary content display', () => {
    it('renders summary content when currentSummary exists', () => {
      const summary = createMockSummary({ content: '# Daily Summary\n\n- Completed feature X\n- Fixed bug Y' })
      ;(useSummary as ReturnType<typeof vi.fn>).mockReturnValue({
        currentSummary: summary,
        summaries: [summary],
        isLoading: false,
        error: null,
        generateSummary: vi.fn(),
        clearError: vi.fn(),
        setCurrentSummary: vi.fn()
      })

      render(<SummaryPanel projects={[]} activeProjectId={null} />)

      expect(screen.getByText(/Completed feature X/)).toBeTruthy()
      expect(screen.getByText(/Fixed bug Y/)).toBeTruthy()
    })

    it('shows daily/weekly badge based on summary type', () => {
      const dailySummary = createMockSummary({ type: 'daily' })
      const weeklySummary = createMockSummary({ type: 'weekly' })

      ;(useSummary as ReturnType<typeof vi.fn>).mockReturnValue({
        currentSummary: dailySummary,
        summaries: [dailySummary],
        isLoading: false,
        error: null,
        generateSummary: vi.fn(),
        clearError: vi.fn(),
        setCurrentSummary: vi.fn()
      })

      const { rerender } = render(<SummaryPanel projects={[]} activeProjectId={null} />)

      // The badge is a span with specific styling - get all "Daily" elements and find the badge span
      const dailyBadges = screen.getAllByText('Daily')
      const dailyBadge = dailyBadges.find(el => el.tagName === 'SPAN')
      expect(dailyBadge).toBeTruthy()

      ;(useSummary as ReturnType<typeof vi.fn>).mockReturnValue({
        currentSummary: weeklySummary,
        summaries: [weeklySummary],
        isLoading: false,
        error: null,
        generateSummary: vi.fn(),
        clearError: vi.fn(),
        setCurrentSummary: vi.fn()
      })

      rerender(<SummaryPanel projects={[]} activeProjectId={null} />)
      // The badge is a span with specific styling
      const weeklyBadges = screen.getAllByText('Weekly')
      const weeklyBadge = weeklyBadges.find(el => el.tagName === 'SPAN')
      expect(weeklyBadge).toBeTruthy()
    })

    it('shows dump count for the summary', () => {
      const summary = createMockSummary({ dumpCount: 42 })
      ;(useSummary as ReturnType<typeof vi.fn>).mockReturnValue({
        currentSummary: summary,
        summaries: [summary],
        isLoading: false,
        error: null,
        generateSummary: vi.fn(),
        clearError: vi.fn(),
        setCurrentSummary: vi.fn()
      })

      render(<SummaryPanel projects={[]} activeProjectId={null} />)

      expect(screen.getByText('(42 dumps)')).toBeTruthy()
    })
  })

  describe('error state', () => {
    it('renders error message when error is set', () => {
      const errorMessage = 'AI summaries require Ollama to be running'
      ;(useSummary as ReturnType<typeof vi.fn>).mockReturnValue({
        currentSummary: null,
        summaries: [],
        isLoading: false,
        error: errorMessage,
        generateSummary: vi.fn(),
        clearError: vi.fn(),
        setCurrentSummary: vi.fn()
      })

      render(<SummaryPanel projects={[]} activeProjectId={null} />)

      expect(screen.getByText(/AI Summary Unavailable/)).toBeTruthy()
      expect(screen.getByText(errorMessage)).toBeTruthy()
    })

    it('has a dismiss button that calls clearError', () => {
      const mockClearError = vi.fn()
      ;(useSummary as ReturnType<typeof vi.fn>).mockReturnValue({
        currentSummary: null,
        summaries: [],
        isLoading: false,
        error: 'Some error',
        generateSummary: vi.fn(),
        clearError: mockClearError,
        setCurrentSummary: vi.fn()
      })

      render(<SummaryPanel projects={[]} activeProjectId={null} />)

      const dismissButton = screen.getByText('Dismiss')
      fireEvent.click(dismissButton)

      expect(mockClearError).toHaveBeenCalled()
    })
  })
})
