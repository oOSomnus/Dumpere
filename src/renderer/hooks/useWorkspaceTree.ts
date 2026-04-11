import { useCallback, useEffect, useMemo, useState } from 'react'
import type { WorkspaceNode, WorkspaceNote } from '@/shared/types'
import { getElectronAPI } from '../lib/electron-api'
import { collectWorkspaceNotePaths } from '../lib/workspace-path-utils'

interface UseWorkspaceTreeReturn {
  tree: WorkspaceNode[]
  isLoading: boolean
  error: string | null
  refresh: (options?: { silent?: boolean }) => Promise<void>
  createFolder: (parentPath: string, name: string) => Promise<WorkspaceNode | null>
  createNote: (parentPath: string, name: string) => Promise<WorkspaceNote | null>
  renameEntry: (path: string, name: string) => Promise<{ path: string } | null>
  deleteEntry: (path: string) => Promise<void>
  notePaths: string[]
}

export function useWorkspaceTree(projectId: string | null): UseWorkspaceTreeReturn {
  const api = getElectronAPI()
  const [tree, setTree] = useState<WorkspaceNode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!projectId) {
      setTree([])
      setIsLoading(false)
      return
    }

    if (!options?.silent) {
      setIsLoading(true)
    }
    setError(null)
    try {
      setTree(await api.workspace.getTree(projectId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load workspace')
    } finally {
      if (!options?.silent) {
        setIsLoading(false)
      }
    }
  }, [projectId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createFolder = useCallback(async (parentPath: string, name: string) => {
    if (!projectId) return null
    const folder = await api.workspace.createFolder(projectId, parentPath, name)
    await refresh({ silent: true })
    return folder
  }, [projectId, refresh])

  const createNote = useCallback(async (parentPath: string, name: string) => {
    if (!projectId) return null
    const note = await api.workspace.createNote(projectId, parentPath, name)
    await refresh({ silent: true })
    return note
  }, [projectId, refresh])

  const renameEntry = useCallback(async (path: string, name: string) => {
    if (!projectId) return null
    const result = await api.workspace.renameEntry(projectId, path, name)
    await refresh({ silent: true })
    return result
  }, [projectId, refresh])

  const deleteEntry = useCallback(async (path: string) => {
    if (!projectId) return
    await api.workspace.deleteEntry(projectId, path)
    await refresh({ silent: true })
  }, [projectId, refresh])

  const notePaths = useMemo(
    () => collectWorkspaceNotePaths(tree, { excludeIndexNote: true }),
    [tree]
  )

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
