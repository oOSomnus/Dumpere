import { useCallback, useRef, useState, type MouseEvent } from 'react'
import type { Project } from '../lib/types'

interface ContextMenuState {
  projectId: string
  x: number
  y: number
}

interface UseSidebarProjectsOptions {
  projects: Project[]
  onCreateProject: (name: string) => void
  onUpdateProject: (id: string, name: string) => void
  onDeleteProject: (id: string) => void
}

export function useSidebarProjects({
  projects,
  onCreateProject,
  onUpdateProject,
  onDeleteProject
}: UseSidebarProjectsOptions) {
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const newProjectInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const startCreatingProject = useCallback(() => {
    setIsCreatingProject(true)
    setTimeout(() => newProjectInputRef.current?.focus(), 0)
  }, [])

  const handleCreateProject = useCallback(() => {
    if (newProjectName.trim()) {
      onCreateProject(newProjectName.trim())
      setNewProjectName('')
      setIsCreatingProject(false)
    }
  }, [newProjectName, onCreateProject])

  const handleStartEdit = useCallback((project: Project) => {
    setEditingProjectId(project.id)
    setEditingName(project.name)
    setContextMenu(null)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (editingProjectId && editingName.trim()) {
      onUpdateProject(editingProjectId, editingName.trim())
    }
    setEditingProjectId(null)
    setEditingName('')
  }, [editingName, editingProjectId, onUpdateProject])

  const cancelProjectEdit = useCallback(() => {
    setEditingProjectId(null)
    setEditingName('')
  }, [])

  const handleDeleteProject = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project && window.confirm(`Delete project '${project.name}'? Dumps will be moved to Unassigned. This cannot be undone.`)) {
      onDeleteProject(projectId)
    }
    setContextMenu(null)
  }, [onDeleteProject, projects])

  const openContextMenu = useCallback((event: MouseEvent, projectId: string) => {
    event.preventDefault()
    setContextMenu({ projectId, x: event.clientX, y: event.clientY })
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const cancelProjectCreation = useCallback(() => {
    setIsCreatingProject(false)
    setNewProjectName('')
  }, [])

  return {
    isCreatingProject,
    newProjectName,
    setNewProjectName,
    editingProjectId,
    editingName,
    setEditingName,
    contextMenu,
    newProjectInputRef,
    editInputRef,
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
