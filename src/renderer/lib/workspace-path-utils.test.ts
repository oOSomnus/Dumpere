import { describe, expect, it } from 'vitest'
import type { WorkspaceNode } from './types'
import {
  buildUniqueWorkspaceChildName,
  collectWorkspaceNotePaths,
  collectWorkspacePaths
} from './workspace-path-utils'

const workspaceTree: WorkspaceNode[] = [
  {
    type: 'folder',
    name: 'docs',
    path: 'docs',
    children: [
      { type: 'note', name: 'index.md', path: 'docs/index.md' },
      { type: 'note', name: 'New Note.md', path: 'docs/New Note.md' },
      { type: 'folder', name: 'New Folder', path: 'docs/New Folder', children: [] },
      { type: 'folder', name: 'nested', path: 'docs/nested', children: [] }
    ]
  },
  { type: 'note', name: 'index.md', path: 'index.md' },
  { type: 'note', name: 'New Note.md', path: 'New Note.md' },
  { type: 'note', name: 'New Note 2.md', path: 'New Note 2.md' },
  { type: 'folder', name: 'New Folder', path: 'New Folder', children: [] },
  { type: 'folder', name: 'New Folder 2', path: 'New Folder 2', children: [] }
]

describe('workspace-path-utils', () => {
  it('collects note and folder paths recursively', () => {
    expect(collectWorkspacePaths(workspaceTree)).toEqual({
      folderPaths: ['docs', 'docs/New Folder', 'docs/nested', 'New Folder', 'New Folder 2'],
      notePaths: ['docs/index.md', 'docs/New Note.md', 'index.md', 'New Note.md', 'New Note 2.md']
    })
  })

  it('builds unique names for root-level folders and notes', () => {
    expect(buildUniqueWorkspaceChildName(workspaceTree, '', 'folder')).toBe('New Folder 3')
    expect(buildUniqueWorkspaceChildName(workspaceTree, '', 'note')).toBe('New Note 3.md')
  })

  it('builds unique names for nested folders and notes and preserves index filtering', () => {
    expect(buildUniqueWorkspaceChildName(workspaceTree, 'docs', 'folder')).toBe('New Folder 2')
    expect(buildUniqueWorkspaceChildName(workspaceTree, 'docs', 'note')).toBe('New Note 2.md')
    expect(collectWorkspaceNotePaths(workspaceTree, { excludeIndexNote: true })).toEqual([
      'docs/index.md',
      'docs/New Note.md',
      'New Note.md',
      'New Note 2.md'
    ])
  })
})
