import { useState, useEffect, useCallback, useRef } from 'react'
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
  updateDump: (id: string, updates: { projectId?: string | null; tags?: string[] }) => Promise<void>
  stripTagFromDumps: (tagId: string) => void
}

export function useDump(): UseDumpReturn {
  const [dumps, setDumps] = useState<DumpEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const dumpsRef = useRef<DumpEntry[]>([])

  // Load dumps on mount
  useEffect(() => {
    const loadDumps = async () => {
      try {
        const storedDumps = await api.getDumps()
        // Sort newest first (VIEW-06)
        const sorted = storedDumps.sort((a, b) => b.createdAt - a.createdAt)
        setDumps(sorted)
        dumpsRef.current = sorted
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

    setDumps(prev => {
      const next = [optimisticDump, ...prev]
      dumpsRef.current = next
      return next
    })
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
      setDumps(prev => {
        const next = prev.map(d => d.id === tempId ? savedDump : d)
        const sorted = [...next].sort((a, b) => b.createdAt - a.createdAt)
        dumpsRef.current = sorted
        return sorted
      })

    } catch (err) {
      console.error('Failed to save dump:', err)
      // Rollback optimistic update
      setDumps(prev => {
        const next = prev.filter(d => d.id !== tempId)
        dumpsRef.current = next
        return next
      })
      setError('Could not save dump. Check your storage space and try again.')
      throw err
    }
  }, [])

  const deleteDump = useCallback(async (id: string) => {
    // Optimistic delete — remove immediately
    const previousDumps = dumpsRef.current
    setDumps(prev => {
      const next = prev.filter(d => d.id !== id)
      dumpsRef.current = next
      return next
    })
    setError(null)

    try {
      await api.deleteDump(id)
    } catch (err) {
      console.error('Failed to delete dump:', err)
      // Rollback
      setDumps(previousDumps)
      dumpsRef.current = previousDumps
      setError('Could not delete dump')
      throw err
    }
  }, [])

  const updateDump = useCallback(async (id: string, updates: { projectId?: string | null; tags?: string[] }) => {
    const previousDumps = dumpsRef.current
    setError(null)

    setDumps(prev => {
      const next = prev.map(dump => dump.id === id
        ? { ...dump, ...updates, updatedAt: Date.now() }
        : dump
      )
      dumpsRef.current = next
      return next
    })

    try {
      await api.updateDump(id, updates)
    } catch (err) {
      console.error('Failed to update dump:', err)
      setDumps(previousDumps)
      dumpsRef.current = previousDumps
      setError('Could not update dump')
      throw err
    }
  }, [])

  const stripTagFromDumps = useCallback((tagId: string) => {
    setDumps(prev => {
      const next = prev.map(dump => (
        dump.tags.includes(tagId)
          ? { ...dump, tags: dump.tags.filter(existingTagId => existingTagId !== tagId) }
          : dump
      ))
      dumpsRef.current = next
      return next
    })
  }, [])

  return {
    dumps,
    isLoading,
    error,
    submitDump,
    deleteDump,
    updateDump,
    stripTagFromDumps
  }
}
