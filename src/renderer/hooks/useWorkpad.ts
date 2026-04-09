import { useCallback, useEffect, useRef, useState } from 'react'
import { ProjectWorkpad, mockElectronAPI } from '../lib/types'

const api = typeof window !== 'undefined' && window.electronAPI
  ? window.electronAPI
  : mockElectronAPI

interface UseWorkpadReturn {
  workpad: ProjectWorkpad | null
  content: string
  setContent: (value: string) => void
  isLoading: boolean
  isSaving: boolean
  error: string | null
  refresh: () => Promise<void>
  saveNow: () => Promise<ProjectWorkpad | null>
}

export function useWorkpad(projectId: string | null): UseWorkpadReturn {
  const [workpad, setWorkpad] = useState<ProjectWorkpad | null>(null)
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedContentRef = useRef('')

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const nextWorkpad = await api.getWorkpad(projectId)
      setWorkpad(nextWorkpad)
      setContent(nextWorkpad.content)
      loadedContentRef.current = nextWorkpad.content
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load workpad'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveNow = useCallback(async () => {
    if (content === loadedContentRef.current) {
      return workpad
    }

    setIsSaving(true)
    setError(null)

    try {
      const saved = await api.updateWorkpad(projectId, content)
      setWorkpad(saved)
      loadedContentRef.current = saved.content
      return saved
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save workpad'
      setError(message)
      return null
    } finally {
      setIsSaving(false)
    }
  }, [content, projectId, workpad])

  useEffect(() => {
    if (isLoading || content === loadedContentRef.current) {
      return
    }

    const timer = window.setTimeout(() => {
      void saveNow()
    }, 500)

    return () => window.clearTimeout(timer)
  }, [content, isLoading, saveNow])

  return {
    workpad,
    content,
    setContent,
    isLoading,
    isSaving,
    error,
    refresh,
    saveNow
  }
}
