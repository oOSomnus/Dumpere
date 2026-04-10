import { useCallback, useEffect, useRef, useState } from 'react'
import { ProjectWorkpad } from '../lib/types'
import { getElectronAPI } from '../lib/electron-api'
import { getDefaultWorkspaceNotePath } from '../lib/workpad-utils'

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
  const api = getElectronAPI()
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
      const nextNote = projectId
        ? await api.readWorkspaceNote(projectId, getDefaultWorkspaceNotePath())
        : { projectId: null, content: '', updatedAt: 0 }
      setWorkpad({
        projectId,
        content: nextNote.content,
        updatedAt: nextNote.updatedAt
      })
      setContent(nextNote.content)
      loadedContentRef.current = nextNote.content
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
      const saved = projectId
        ? await api.updateWorkspaceNote(projectId, getDefaultWorkspaceNotePath(), content)
        : { projectId: null, path: getDefaultWorkspaceNotePath(), content, updatedAt: Date.now() }
      setWorkpad({
        projectId,
        content: saved.content,
        updatedAt: saved.updatedAt
      })
      loadedContentRef.current = saved.content
      return {
        projectId,
        content: saved.content,
        updatedAt: saved.updatedAt
      }
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
