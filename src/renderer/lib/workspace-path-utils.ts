import type { WorkspaceNode } from '@/shared/types'

export interface WorkspacePaths {
  folderPaths: string[]
  notePaths: string[]
}

export function collectWorkspacePaths(nodes: WorkspaceNode[]): WorkspacePaths {
  const paths: WorkspacePaths = {
    folderPaths: [],
    notePaths: []
  }

  const visit = (entries: WorkspaceNode[]) => {
    for (const entry of entries) {
      if (entry.type === 'folder') {
        paths.folderPaths.push(entry.path)
        visit(entry.children ?? [])
        continue
      }

      paths.notePaths.push(entry.path)
    }
  }

  visit(nodes)
  return paths
}

export function collectWorkspaceNotePaths(
  nodes: WorkspaceNode[],
  options: { excludeIndexNote?: boolean } = {}
): string[] {
  const { excludeIndexNote = false } = options
  const { notePaths } = collectWorkspacePaths(nodes)

  if (!excludeIndexNote) {
    return notePaths
  }

  return notePaths.filter(path => path !== 'index.md')
}

export function buildUniqueWorkspaceChildName(
  nodes: WorkspaceNode[],
  parentPath: string,
  type: 'folder' | 'note',
  labels: { folder: string; note: string } = { folder: 'New Folder', note: 'New Note' }
): string {
  const { folderPaths, notePaths } = collectWorkspacePaths(nodes)
  const existingPaths = new Set(type === 'folder' ? folderPaths : notePaths)
  const baseName = type === 'folder' ? labels.folder : labels.note
  const extension = type === 'note' ? '.md' : ''
  const normalizedParent = parentPath ? `${parentPath}/` : ''

  let index = 1
  while (true) {
    const suffix = index === 1 ? '' : ` ${index}`
    const candidate = `${baseName}${suffix}${extension}`
    const candidatePath = `${normalizedParent}${candidate}`

    if (!existingPaths.has(candidatePath)) {
      return candidate
    }

    index += 1
  }
}
