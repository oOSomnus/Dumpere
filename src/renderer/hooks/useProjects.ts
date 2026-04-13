import { useState, useEffect } from 'react'
import type { Project } from '@/shared/types'
import { getProjectNameMaxLength, validateProjectName } from '@/shared/naming'
import { getElectronAPI } from '../lib/electron-api'

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
  const api = getElectronAPI()
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const storedProjects = await api.data.getProjects()
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
    const trimmedName = validateProjectName(name)
    setError(null)
    try {
      const savedProject = await api.data.createProject(trimmedName)
      setProjects(prev => [savedProject, ...prev])
      return savedProject
    } catch (err) {
      console.error('Failed to create project:', err)
      setError('Could not create project')
      throw err
    }
  }

  const updateProject = async (id: string, name: string): Promise<void> => {
    const trimmedName = validateProjectName(name)

    setError(null)
    try {
      const updatedProject = await api.data.updateProject(id, trimmedName)
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
      await api.data.deleteProject(id)
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

export const PROJECT_NAME_MAX_LENGTH = getProjectNameMaxLength()
