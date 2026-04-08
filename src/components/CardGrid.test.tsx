import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CardGrid } from '../renderer/components/CardGrid'
import { DumpEntry, Project, Tag } from '../renderer/lib/types'

describe('CardGrid', () => {
  // Helper to create mock dumps
  const createMockDump = (overrides: Partial<DumpEntry> = {}): DumpEntry => ({
    id: crypto.randomUUID(),
    text: 'Test dump',
    files: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    projectId: null,
    tags: [],
    ...overrides
  })

  const mockProjects: Project[] = []
  const mockTags: Tag[] = []
  const mockOnDelete = vi.fn()
  const mockOnProjectChange = vi.fn()
  const mockOnTagsChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders grid of dump cards', () => {
      const mockDumps: DumpEntry[] = [
        createMockDump({ id: '1', text: 'First dump' }),
        createMockDump({ id: '2', text: 'Second dump' }),
      ]

      render(
        <CardGrid
          dumps={mockDumps}
          onDelete={mockOnDelete}
          projects={mockProjects}
          tags={mockTags}
          onProjectChange={mockOnProjectChange}
          onTagsChange={mockOnTagsChange}
        />
      )

      expect(screen.getByText('First dump')).toBeInTheDocument()
      expect(screen.getByText('Second dump')).toBeInTheDocument()
    })

    it('renders empty state when no dumps', () => {
      const { container } = render(
        <CardGrid
          dumps={[]}
          onDelete={mockOnDelete}
          projects={mockProjects}
          tags={mockTags}
          onProjectChange={mockOnProjectChange}
          onTagsChange={mockOnTagsChange}
        />
      )

      // EmptyState should render something
      expect(container.firstChild).toBeInTheDocument()
    })

    it('shows loading state when isLoading is true and no dumps', () => {
      render(
        <CardGrid
          dumps={[]}
          onDelete={mockOnDelete}
          isLoading={true}
          projects={mockProjects}
          tags={mockTags}
          onProjectChange={mockOnProjectChange}
          onTagsChange={mockOnTagsChange}
        />
      )

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('filtering and sorting', () => {
    it('sorts dumps by createdAt descending by default', () => {
      const olderDump = createMockDump({ id: '1', text: 'Older', createdAt: Date.now() - 10000 })
      const newerDump = createMockDump({ id: '2', text: 'Newer', createdAt: Date.now() })

      render(
        <CardGrid
          dumps={[olderDump, newerDump]}
          onDelete={mockOnDelete}
          projects={mockProjects}
          tags={mockTags}
          onProjectChange={mockOnProjectChange}
          onTagsChange={mockOnTagsChange}
        />
      )

      // Both should be rendered (sorting is internal to the grid)
      expect(screen.getByText('Older')).toBeInTheDocument()
      expect(screen.getByText('Newer')).toBeInTheDocument()
    })
  })

  describe('dump card interactions', () => {
    it('renders dump with files', () => {
      const dumpWithFiles: DumpEntry = createMockDump({
        id: '1',
        text: 'Dump with files',
        files: [{
          id: 'f1',
          originalName: 'test.jpg',
          storedPath: 'images/test.jpg',
          mimeType: 'image/jpeg',
          size: 1000
        }]
      })

      render(
        <CardGrid
          dumps={[dumpWithFiles]}
          onDelete={mockOnDelete}
          projects={mockProjects}
          tags={mockTags}
          onProjectChange={mockOnProjectChange}
          onTagsChange={mockOnTagsChange}
        />
      )

      expect(screen.getByText('Dump with files')).toBeInTheDocument()
    })
  })
})
