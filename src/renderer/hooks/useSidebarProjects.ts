import { useCallback, useRef, useState, type MouseEvent } from 'react'
import type { Project } from '../lib/types'
import { usePrompt } from './usePrompt'

interface ContextMenuState {
  projectId: string
  x: number
  y: number
}

interface UseSidebarProjectsOptions {
  projects: Project[]
  onCreateProject: (name: string) => Promise<void> | void
  onUpdateProject: (id: string, name: string) => Promise<void> | void
  onDeleteProject: (id: string) => Promise<void> | void
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback
}

export function useSidebarProjects({
  projects,
  onCreateProject,
  onUpdateProject,
  onDeleteProject
}: UseSidebarProjectsOptions) {
  const prompt = usePrompt()
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [projectError, setProjectError] = useState<string | null>(null)
  const [isMutating, setIsMutating] = useState(false)
  const newProjectInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const startCreatingProject = useCallback(() => {
    if (isMutating) return
    setProjectError(null)
    setIsCreatingProject(true)
    setTimeout(() => newProjectInputRef.current?.focus(), 0)
  }, [isMutating])

  const handleCreateProject = useCallback(async () => {
    const trimmedName = newProjectName.trim()
    if (!trimmedName || isMutating) {
      return
    }

    setIsMutating(true)
    setProjectError(null)

    try {
      await onCreateProject(trimmedName)
      setNewProjectName('')
      setIsCreatingProject(false)
    } catch (error) {
      setProjectError(getErrorMessage(error, 'Could not create project'))
    } finally {
      setIsMutating(false)
    }
  }, [isMutating, newProjectName, onCreateProject])

  const handleStartEdit = useCallback((project: Project) => {
    if (isMutating) return
    setProjectError(null)
    setEditingProjectId(project.id)
    setEditingName(project.name)
    setContextMenu(null)
  }, [isMutating])

  const handleSaveEdit = useCallback(async () => {
    const trimmedName = editingName.trim()
    if (isMutating) {
      return
    }

    if (!editingProjectId) {
      return
    }

    if (!trimmedName) {
      setEditingProjectId(null)
      setEditingName('')
      setProjectError(null)
      return
    }

    setIsMutating(true)
    setProjectError(null)

    try {
      await onUpdateProject(editingProjectId, trimmedName)
      setEditingProjectId(null)
      setEditingName('')
    } catch (error) {
      setProjectError(getErrorMessage(error, 'Could not update project'))
    } finally {
      setIsMutating(false)
    }
  }, [editingName, editingProjectId, isMutating, onUpdateProject])

  const cancelProjectEdit = useCallback(() => {
    setEditingProjectId(null)
    setEditingName('')
    setProjectError(null)
  }, [])

  const handleDeleteProject = useCallback(async (projectId: string) => {
    const project = projects.find(p => p.id === projectId)

    if (!project || isMutating) {
      setContextMenu(null)
      return
    }

    const confirmed = await prompt.confirm({
      title: `Delete project '${project.name}'?`,
      description: 'Dumps will be moved to Unassigned. This cannot be undone.',
      confirmLabel: 'Delete Project',
      destructive: true
    })

    if (!confirmed) {
      setContextMenu(null)
      return
    }

    setIsMutating(true)
    setProjectError(null)

    try {
      await onDeleteProject(projectId)
      setContextMenu(null)
    } catch (error) {
      setProjectError(getErrorMessage(error, 'Could not delete project'))
    } finally {
      setIsMutating(false)
    }
  }, [isMutating, onDeleteProject, projects, prompt])

  const openContextMenu = useCallback((event: MouseEvent, projectId: string) => {
    event.preventDefault()
    setProjectError(null)
    setContextMenu({ projectId, x: event.clientX, y: event.clientY })
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const clearProjectError = useCallback(() => {
    setProjectError(null)
  }, [])

  const cancelProjectCreation = useCallback(() => {
    setIsCreatingProject(false)
    setNewProjectName('')
    setProjectError(null)
  }, [])

  return {
    isCreatingProject,
    isMutating,
    newProjectName,
    setNewProjectName,
    editingProjectId,
    editingName,
    setEditingName,
    contextMenu,
    projectError,
    newProjectInputRef,
    editInputRef,
    clearProjectError,
    startCreatingProject,
    handleCreateProject,
    handleStartEdit,
    handleSaveEdit,
    cancelProjectEdit,
    handleDeleteProject,
    openContextMenu,
    closeContextMenu,
    cancelProjectCreation
  }
}
