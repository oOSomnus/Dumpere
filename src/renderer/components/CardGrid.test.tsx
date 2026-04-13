import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DumpEntry, Project, Tag } from '../lib/types'
import { renderWithPrompt } from '../test-utils'
import { CardGrid } from './CardGrid'
import { getTagColorForIndex } from '@/shared/tag-colors'

vi.mock('../hooks/useFileUrl', () => ({
  useFileUrl: vi.fn(() => null)
}))

describe('CardGrid', () => {
  const projects: Project[] = [
    { id: 'project-1', name: 'Alpha', createdAt: 1 }
  ]

  const allTags: Tag[] = [
    { id: 'tag-1', name: 'tag1', createdAt: 1, color: getTagColorForIndex(0) },
    { id: 'tag-2', name: 'tag2', createdAt: 2, color: getTagColorForIndex(1) }
  ]

  const baseDump: DumpEntry = {
    id: 'dump-1',
    text: 'Test dump',
    files: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    projectId: 'project-1',
    tags: ['tag-1']
  }

  it('keeps the expanded dump in sync when tags change', async () => {
    const { rerender } = renderWithPrompt(
      <CardGrid
        dumps={[baseDump]}
        onDelete={vi.fn()}
        projects={projects}
        tags={allTags}
        onProjectChange={vi.fn()}
        onTagsChange={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText('Test dump'))
    expect(screen.getByRole('button', { name: /tag1/i })).toBeTruthy()

    rerender(
      <CardGrid
        dumps={[{ ...baseDump, tags: ['tag-2'] }]}
        onDelete={vi.fn()}
        projects={projects}
        tags={allTags}
        onProjectChange={vi.fn()}
        onTagsChange={vi.fn()}
      />
    )

    const selectedTagButtons = screen.getAllByTitle('Click to remove')
    expect(selectedTagButtons).toHaveLength(1)
    expect(selectedTagButtons[0]?.textContent).toContain('tag2')
  })
})
