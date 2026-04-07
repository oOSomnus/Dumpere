import { useState, useEffect, useCallback } from 'react'
import { DumpEntry, StoredFile, mockElectronAPI } from '../lib/types'

const api = typeof window !== 'undefined' && window.electronAPI
  ? window.electronAPI
  : mockElectronAPI

interface UseDumpReturn {
  dumps: DumpEntry[]
  isLoading: boolean
  error: string | null
  submitDump: (text: string, filePaths: string[], projectId: string | null, tagIds: string[]) => Promise<void>
  deleteDump: (id: string) => Promise<void>
}

export function useDump(): UseDumpReturn {
  const [dumps, setDumps] = useState<DumpEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load dumps on mount
  useEffect(() => {
    const loadDumps = async () => {
      try {
        const storedDumps = await api.getDumps()
        // Sort newest first (VIEW-06)
        const sorted = storedDumps.sort((a, b) => b.createdAt - a.createdAt)
        setDumps(sorted)
      } catch (err) {
        console.error('Failed to load dumps:', err)
        setError('Could not load dumps')
      } finally {
        setIsLoading(false)
      }
    }
    loadDumps()
  }, [])

  const submitDump = useCallback(async (text: string, filePaths: string[], projectId: string | null, tagIds: string[]) => {
    const tempId = crypto.randomUUID()
    const now = Date.now()

    // D-07: Optimistic update — show immediately before IPC confirmation
    const optimisticDump: DumpEntry = {
      id: tempId,
      text,
      files: [], // Will be populated after copy
      createdAt: now,
      updatedAt: now,
      projectId,  // Phase 2
      tags: tagIds  // Phase 2
    }

    setDumps(prev => [optimisticDump, ...prev])
    setError(null)

    try {
      // Copy files to app storage first
      let storedFiles: StoredFile[] = []
      if (filePaths.length > 0) {
        storedFiles = await api.copyFiles(filePaths)
      }

      // Create the dump entry with all data
      const dumpToSave: Omit<DumpEntry, 'id'> = {
        text,
        files: storedFiles,
        createdAt: now,
        updatedAt: now,
        projectId,  // Phase 2
        tags: tagIds  // Phase 2
      }

      // Save to store via IPC
      const savedDump = await api.saveDump(dumpToSave)

      // Replace optimistic entry with confirmed one
      setDumps(prev => prev.map(d => d.id === tempId ? savedDump : d))

      // VIEW-06: Ensure sorted order maintained
      setDumps(prev => [...prev].sort((a, b) => b.createdAt - a.createdAt))

    } catch (err) {
      console.error('Failed to save dump:', err)
      // Rollback optimistic update
      setDumps(prev => prev.filter(d => d.id !== tempId))
      setError('Could not save dump. Check your storage space and try again.')
      throw err
    }
  }, [])

  const deleteDump = useCallback(async (id: string) => {
    // Optimistic delete — remove immediately
    const previousDumps = dumps
    setDumps(prev => prev.filter(d => d.id !== id))
    setError(null)

    try {
      await api.deleteDump(id)
    } catch (err) {
      console.error('Failed to delete dump:', err)
      // Rollback
      setDumps(previousDumps)
      setError('Could not delete dump')
      throw err
    }
  }, [dumps])

  return {
    dumps,
    isLoading,
    error,
    submitDump,
    deleteDump
  }
}
