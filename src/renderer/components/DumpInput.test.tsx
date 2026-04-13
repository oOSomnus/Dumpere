import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DumpInput } from './DumpInput'
import type { Project, Tag } from '../lib/types'

const projects: Project[] = [
  { id: 'project-1', name: 'Alpha', createdAt: 1 }
]

const tags: Tag[] = []

describe('DumpInput', () => {
  it('disables the composer when no project is selected', () => {
    render(
      <DumpInput
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        projects={projects}
        activeProjectId={null}
        onProjectSelect={vi.fn()}
        allTags={tags}
        selectedTagIds={[]}
        onTagsChange={vi.fn()}
        getAISuggestions={() => []}
        onCreateTag={vi.fn()}
      />
    )

    const textarea = screen.getByPlaceholderText('Select a project to start dumping.')
    expect(textarea).toHaveProperty('disabled', true)
  })

  it('re-enables the composer when a project is selected', () => {
    render(
      <DumpInput
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        projects={projects}
        activeProjectId="project-1"
        onProjectSelect={vi.fn()}
        allTags={tags}
        selectedTagIds={[]}
        onTagsChange={vi.fn()}
        getAISuggestions={() => []}
        onCreateTag={vi.fn()}
      />
    )

    const textarea = screen.getByPlaceholderText('Dump something... (Enter to add tags)')
    expect(textarea).toHaveProperty('disabled', false)
  })

  it('clears draft text when switching back to all-projects mode', () => {
    const { rerender } = render(
      <DumpInput
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        projects={projects}
        activeProjectId="project-1"
        onProjectSelect={vi.fn()}
        allTags={tags}
        selectedTagIds={[]}
        onTagsChange={vi.fn()}
        getAISuggestions={() => []}
        onCreateTag={vi.fn()}
      />
    )

    const textarea = screen.getByPlaceholderText('Dump something... (Enter to add tags)')
    fireEvent.change(textarea, { target: { value: 'Draft dump' } })
    expect(textarea).toHaveProperty('value', 'Draft dump')

    rerender(
      <DumpInput
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        projects={projects}
        activeProjectId={null}
        onProjectSelect={vi.fn()}
        allTags={tags}
        selectedTagIds={[]}
        onTagsChange={vi.fn()}
        getAISuggestions={() => []}
        onCreateTag={vi.fn()}
      />
    )

    const disabledTextarea = screen.getByPlaceholderText('Select a project to start dumping.')
    expect(disabledTextarea).toHaveProperty('disabled', true)
    expect(disabledTextarea).toHaveProperty('value', '')
  })
})
