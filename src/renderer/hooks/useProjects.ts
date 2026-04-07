import { useState, useEffect } from 'react'
import { Project, mockElectronAPI } from '../lib/types'

const api = typeof window !== 'undefined' && window.electronAPI
  ? window.electronAPI
  : mockElectronAPI

// Input validation constants
const MAX_PROJECT_NAME_LENGTH = 50
const PROJECT_NAME_REGEX = /^[a-zA-Z0-9\s]+$/

interface UseProjectsReturn {
  projects: Project[]
  activeProjectId: string | null
  setActiveProject: (id: string | null) => void
  isLoading: boolean
  error: string | null
  createProject: (name: string) => Promise<Project>
  updateProject: (id: string, name: string) => Promise<void>
  deleteProject: (id: string) => Promise<void>
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const storedProjects = await api.getProjects()
        // Sort by createdAt descending
        const sorted = storedProjects.sort((a, b) => b.createdAt - a.createdAt)
        setProjects(sorted)
      } catch (err) {
        console.error('Failed to load projects:', err)
        setError('Could not load projects')
      } finally {
        setIsLoading(false)
      }
    }
    loadProjects()
  }, [])

  const createProject = async (name: string): Promise<Project> => {
    // Input validation
    if (!name || name.trim().length === 0) {
      throw new Error('Project name is required')
    }
    if (name.length > MAX_PROJECT_NAME_LENGTH) {
      throw new Error(`Project name must be ${MAX_PROJECT_NAME_LENGTH} characters or less`)
    }
    if (!PROJECT_NAME_REGEX.test(name)) {
      throw new Error('Project name must contain only alphanumeric characters and spaces')
    }

    const trimmedName = name.trim()
    const now = Date.now()
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: trimmedName,
      createdAt: now
    }

    try {
      const savedProject = await api.saveProject(newProject)
      setProjects(prev => [savedProject, ...prev])
      return savedProject
    } catch (err) {
      console.error('Failed to create project:', err)
      setError('Could not create project')
      throw err
    }
  }

  const updateProject = async (id: string, name: string): Promise<void> => {
    // Input validation
    if (!name || name.trim().length === 0) {
      throw new Error('Project name is required')
    }
    if (name.length > MAX_PROJECT_NAME_LENGTH) {
      throw new Error(`Project name must be ${MAX_PROJECT_NAME_LENGTH} characters or less`)
    }
    if (!PROJECT_NAME_REGEX.test(name)) {
      throw new Error('Project name must contain only alphanumeric characters and spaces')
    }

    const trimmedName = name.trim()

    try {
      const updatedProject = await api.updateProject(id, trimmedName)
      setProjects(prev => prev.map(p => p.id === id ? updatedProject : p))
    } catch (err) {
      console.error('Failed to update project:', err)
      setError('Could not update project')
      throw err
    }
  }

  const deleteProject = async (id: string): Promise<void> => {
    // Optimistic delete
    const previousProjects = projects
    const previousActiveId = activeProjectId

    // If deleting the active project, clear the active project
    if (activeProjectId === id) {
      setActiveProjectId(null)
    }

    setProjects(prev => prev.filter(p => p.id !== id))
    setError(null)

    try {
      await api.deleteProject(id)
    } catch (err) {
      console.error('Failed to delete project:', err)
      // Rollback
      setProjects(previousProjects)
      setActiveProjectId(previousActiveId)
      setError('Could not delete project')
      throw err
    }
  }

  const setActiveProject = (id: string | null): void => {
    setActiveProjectId(id)
  }

  return {
    projects,
    activeProjectId,
    setActiveProject,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject
  }
}
