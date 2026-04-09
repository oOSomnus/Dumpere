import { useCallback, useEffect, useRef, useState } from 'react'
import { WorkspaceNote, mockElectronAPI } from '../lib/types'

const api = typeof window !== 'undefined' && window.electronAPI
  ? window.electronAPI
  : mockElectronAPI

interface UseWorkspaceNoteReturn {
  note: WorkspaceNote | null
  content: string
  setContent: (value: string) => void
  isLoading: boolean
  isSaving: boolean
  error: string | null
  refresh: () => Promise<void>
  saveNow: () => Promise<WorkspaceNote | null>
}

export function useWorkspaceNote(projectId: string | null, notePath: string | null): UseWorkspaceNoteReturn {
  const [note, setNote] = useState<WorkspaceNote | null>(null)
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedContentRef = useRef('')

  const refresh = useCallback(async () => {
    if (!projectId || !notePath) {
      setNote(null)
      setContent('')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const nextNote = await api.readWorkspaceNote(projectId, notePath)
      setNote(nextNote)
      setContent(nextNote.content)
      loadedContentRef.current = nextNote.content
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load note')
    } finally {
      setIsLoading(false)
    }
  }, [notePath, projectId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveNow = useCallback(async () => {
    if (!projectId || !notePath) {
      return null
    }

    if (content === loadedContentRef.current && note) {
      return note
    }

    setIsSaving(true)
    setError(null)
    try {
      const saved = await api.updateWorkspaceNote(projectId, notePath, content)
      setNote(saved)
      loadedContentRef.current = saved.content
      return saved
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save note')
      return null
    } finally {
      setIsSaving(false)
    }
  }, [content, note, notePath, projectId])

  useEffect(() => {
    if (isLoading || !projectId || !notePath || content === loadedContentRef.current) {
      return
    }

    const timer = window.setTimeout(() => {
      void saveNow()
    }, 500)

    return () => window.clearTimeout(timer)
  }, [content, isLoading, notePath, projectId, saveNow])

  return {
    note,
    content,
    setContent,
    isLoading,
    isSaving,
    error,
    refresh,
    saveNow
  }
}
