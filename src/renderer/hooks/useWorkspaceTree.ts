import { useCallback, useEffect, useMemo, useState } from 'react'
import { WorkspaceNode, WorkspaceNote } from '../lib/types'
import { getElectronAPI } from '../lib/electron-api'

interface UseWorkspaceTreeReturn {
  tree: WorkspaceNode[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  createFolder: (parentPath: string, name: string) => Promise<void>
  createNote: (parentPath: string, name: string) => Promise<WorkspaceNote | null>
  renameEntry: (path: string, name: string) => Promise<{ path: string } | null>
  deleteEntry: (path: string) => Promise<void>
  notePaths: string[]
}

function collectNotePaths(nodes: WorkspaceNode[]): string[] {
  return nodes.flatMap(node => {
    if (node.type === 'note') {
      return node.path === 'index.md' ? [] : [node.path]
    }

    return collectNotePaths(node.children || [])
  })
}

export function useWorkspaceTree(projectId: string | null): UseWorkspaceTreeReturn {
  const api = getElectronAPI()
  const [tree, setTree] = useState<WorkspaceNode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!projectId) {
      setTree([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      setTree(await api.getWorkspaceTree(projectId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load workspace')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createFolder = useCallback(async (parentPath: string, name: string) => {
    if (!projectId) return
    await api.createWorkspaceFolder(projectId, parentPath, name)
    await refresh()
  }, [projectId, refresh])

  const createNote = useCallback(async (parentPath: string, name: string) => {
    if (!projectId) return null
    const note = await api.createWorkspaceNote(projectId, parentPath, name)
    await refresh()
    return note
  }, [projectId, refresh])

  const renameEntry = useCallback(async (path: string, name: string) => {
    if (!projectId) return null
    const result = await api.renameWorkspaceEntry(projectId, path, name)
    await refresh()
    return result
  }, [projectId, refresh])

  const deleteEntry = useCallback(async (path: string) => {
    if (!projectId) return
    await api.deleteWorkspaceEntry(projectId, path)
    await refresh()
  }, [projectId, refresh])

  const notePaths = useMemo(() => collectNotePaths(tree), [tree])

  return {
    tree,
    isLoading,
    error,
    refresh,
    createFolder,
    createNote,
    renameEntry,
    deleteEntry,
    notePaths
  }
}
