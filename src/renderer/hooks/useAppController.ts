import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useDump } from './useDump'
import { useProjects } from './useProjects'
import { useTags } from './useTags'
import { useFilter } from './useFilter'
import { useSearch } from './useSearch'
import { getElectronAPI } from '../lib/electron-api'

export type AppView = 'grid' | 'summaries' | 'settings'

export function useAppController() {
  const { dumps, submitDump, deleteDump, updateDump, stripTagFromDumps, isLoading, error } = useDump()
  const { projects, activeProjectId, setActiveProject, createProject, updateProject: renameProject, deleteProject } = useProjects()
  const { tags, createTag, deleteTag, getAISuggestions } = useTags()
  const { filters, setProjectFilter, toggleTagFilter, setDatePreset, toggleDate, setDateKeys, clearDateFilter, applyFilters } = useFilter()
  const { searchQuery, setSearchQuery, search } = useSearch()
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false)
  const [currentView, setCurrentView] = useState<AppView>('grid')
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const searchResults = useMemo(() => {
    return search(deferredSearchQuery, dumps)
  }, [deferredSearchQuery, dumps, search])

  const switchToGrid = useCallback(() => {
    setCurrentView('grid')
  }, [])

  const handleViewChange = useCallback((view: AppView) => {
    setCurrentView(view)
  }, [])

  const handleSidebarProjectSelect = useCallback((projectId: string | null) => {
    const nextProjectFilterId = filters.projectId === projectId ? null : projectId
    switchToGrid()

    if (projectId) {
      setActiveProject(projectId)
    }

    setProjectFilter(nextProjectFilterId)
  }, [filters.projectId, setActiveProject, setProjectFilter, switchToGrid])

  const handleComposerProjectSelect = useCallback((projectId: string | null) => {
    if (!projectId) return

    switchToGrid()
    setActiveProject(projectId)
    if (filters.projectId !== projectId) {
      setProjectFilter(projectId)
    }
  }, [filters.projectId, setActiveProject, setProjectFilter, switchToGrid])

  const handleTagToggle = useCallback((tagId: string) => {
    switchToGrid()
    toggleTagFilter(tagId)
  }, [switchToGrid, toggleTagFilter])

  const handleDeleteTag = useCallback(async (tagId: string) => {
    await deleteTag(tagId)

    if (filters.tagIds.includes(tagId)) {
      toggleTagFilter(tagId)
    }

    setSelectedTagIds(prev => prev.filter(existingTagId => existingTagId !== tagId))
    stripTagFromDumps(tagId)
  }, [deleteTag, filters.tagIds, stripTagFromDumps, toggleTagFilter])

  const handleSubmit = useCallback(async (text: string, filePaths: string[], projectId: string | null, tagIds: string[]) => {
    await submitDump(text, filePaths, projectId, tagIds)
    setSelectedTagIds([])
  }, [submitDump])

  const handleCreateProject = useCallback(async (name: string) => {
    await createProject(name)
  }, [createProject])

  const handleUpdateProject = useCallback(async (id: string, name: string) => {
    await renameProject(id, name)
  }, [renameProject])

  const handleDeleteProject = useCallback(async (id: string) => {
    await deleteProject(id)
  }, [deleteProject])

  const handleDumpProjectChange = useCallback((dumpId: string, projectId: string | null) => {
    void updateDump(dumpId, { projectId })
  }, [updateDump])

  const handleDumpTagsChange = useCallback((dumpId: string, tagIds: string[]) => {
    void updateDump(dumpId, { tags: tagIds })
  }, [updateDump])

  const handleExportProject = useCallback(async (projectId: string) => {
    const api = getElectronAPI()
    const project = projects.find(p => p.id === projectId)
    if (!project) return

    const projectDumps = dumps.filter(d => d.projectId === projectId)
    if (projectDumps.length === 0) {
      alert('No dumps in this project to export')
      return
    }

    const savePath = await api.exportSaveDialog(`${project.name}.zip`)
    if (!savePath) return

    const result = await api.exportDumps(projectDumps.map(d => d.id), project.name, savePath)
    if (result) {
      alert('Export successful!')
    }
  }, [dumps, projects])

  const handleImportProject = useCallback(async (projectId: string) => {
    const api = getElectronAPI()
    const project = projects.find(p => p.id === projectId)
    if (!project) return

    const confirmed = window.confirm(
      `Import to Project: Dumps will be added to ${project.name}. Existing dumps will not be affected. Continue?`
    )
    if (!confirmed) return

    const zipPath = await api.importDialog()
    if (!zipPath) return

    const count = await api.importDumps(zipPath, projectId)
    alert(`Imported ${count} dumps to ${project.name}`)
  }, [projects])

  const handleExportSelected = useCallback(async (dumpIds: string[]) => {
    if (dumpIds.length === 0) return

    const api = getElectronAPI()
    const savePath = await api.exportSaveDialog(`export-${Date.now()}.zip`)
    if (!savePath) return

    const result = await api.exportDumps(dumpIds, 'export', savePath)
    if (result) {
      alert(`Exported ${dumpIds.length} dumps`)
    }
  }, [])

  const handleSearchChange = useCallback((query: string) => {
    switchToGrid()
    setSearchQuery(query)
  }, [setSearchQuery, switchToGrid])

  const handleDatePresetChange = useCallback((preset: Parameters<typeof setDatePreset>[0]) => {
    switchToGrid()
    setDatePreset(preset)
  }, [setDatePreset, switchToGrid])

  const handleToggleDate = useCallback((dateKey: string) => {
    switchToGrid()
    toggleDate(dateKey)
  }, [switchToGrid, toggleDate])

  const handleSetDateKeys = useCallback((dateKeys: string[]) => {
    switchToGrid()
    setDateKeys(dateKeys)
  }, [setDateKeys, switchToGrid])

  const handleClearDateFilter = useCallback(() => {
    switchToGrid()
    clearDateFilter()
  }, [clearDateFilter, switchToGrid])

  return {
    dumps,
    projects,
    tags,
    activeProjectId,
    filters,
    searchQuery,
    deferredSearchQuery,
    searchResults,
    selectedTagIds,
    currentView,
    shouldAutoFocusComposer: !isSearchInputFocused,
    isLoading,
    error,
    applyFilters,
    createProject: handleCreateProject,
    updateProject: handleUpdateProject,
    deleteProject: handleDeleteProject,
    createTag,
    getAISuggestions,
    setSelectedTagIds,
    handleViewChange,
    handleSidebarProjectSelect,
    handleComposerProjectSelect,
    handleTagToggle,
    handleDeleteTag,
    handleDatePresetChange,
    handleToggleDate,
    handleSetDateKeys,
    handleClearDateFilter,
    handleSearchChange,
    handleSearchFocusChange: setIsSearchInputFocused,
    handleSubmit,
    handleDumpProjectChange,
    handleDumpTagsChange,
    handleExportProject,
    handleImportProject,
    handleExportSelected,
    deleteDump
  }
}
