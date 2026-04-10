import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { WorkspaceTree } from './WorkspaceTree'
import type { WorkspaceNode, WorkspaceNote } from '../lib/types'

describe('WorkspaceTree', () => {
  const tree: WorkspaceNode[] = [
    { type: 'folder', name: 'docs', path: 'docs', children: [] },
    { type: 'note', name: 'index.md', path: 'index.md' }
  ]

  it('starts renaming immediately after creating a note and confirms with Enter', async () => {
    const onCreateNote = vi.fn<(_parentPath: string) => Promise<WorkspaceNote | null>>().mockResolvedValue({
      projectId: 'project-1',
      path: 'New Note.md',
      content: '',
      updatedAt: Date.now()
    })
    const onRename = vi.fn().mockResolvedValue({ path: 'plan.md' })

    render(
      <WorkspaceTree
        tree={tree}
        selectedPath={null}
        onSelect={vi.fn()}
        onCreateFolder={vi.fn().mockResolvedValue(null)}
        onCreateNote={onCreateNote}
        onRename={onRename}
        onDelete={vi.fn()}
      />
    )

    fireEvent.click(screen.getAllByTitle('New note')[0] as HTMLElement)

    const input = await screen.findByDisplayValue('New Note')
    fireEvent.change(input, { target: { value: 'Plan' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(onCreateNote).toHaveBeenCalledWith('')
      expect(onRename).toHaveBeenCalledWith('New Note.md', 'Plan')
    })
  })

  it('deletes a newly created folder when renaming is cancelled with Escape', async () => {
    const onCreateFolder = vi.fn().mockResolvedValue({
      type: 'folder',
      name: 'New Folder',
      path: 'New Folder',
      children: []
    })
    const onDelete = vi.fn().mockResolvedValue(undefined)
    const onRename = vi.fn()

    render(
      <WorkspaceTree
        tree={tree}
        selectedPath={null}
        onSelect={vi.fn()}
        onCreateFolder={onCreateFolder}
        onCreateNote={vi.fn().mockResolvedValue(null)}
        onRename={onRename}
        onDelete={onDelete}
      />
    )

    fireEvent.click(screen.getAllByTitle('New folder')[0] as HTMLElement)

    const input = await screen.findByDisplayValue('New Folder')
    fireEvent.keyDown(input, { key: 'Escape' })
    fireEvent.blur(input)

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledTimes(1)
      expect(onDelete).toHaveBeenCalledWith('New Folder', { skipConfirm: true })
      expect(onRename).not.toHaveBeenCalled()
    })
  })
})
