import { useState, useEffect, useMemo, useCallback } from 'react'
import { AppShell } from './components/AppShell'
import { DumpInput } from './components/DumpInput'
import { CardGrid } from './components/CardGrid'
import { Sidebar } from './components/Sidebar'
import { SummaryPanel } from './components/SummaryPanel'
import { useDump } from './hooks/useDump'
import { useProjects } from './hooks/useProjects'
import { useTags } from './hooks/useTags'
import { useFilter } from './hooks/useFilter'
import { useSearch } from './hooks/useSearch'
import { useVault } from './hooks/useVault'
import { WelcomeScreen } from './components/WelcomeScreen'
import { VaultPlaceholder } from './components/VaultPlaceholder'
import { DumpEntry } from './lib/types'

const api = typeof window !== 'undefined' && window.electronAPI
  ? window.electronAPI
  : {
      getDumpOrder: async () => [],
      setDumpOrder: async () => {},
      updateDump: async (id: string, updates: { projectId?: string | null; tags?: string[] }) => ({ id, text: '', files: [], createdAt: Date.now(), updatedAt: Date.now(), projectId: null, tags: [], ...updates }),
      exportSaveDialog: async () => null,
      exportDumps: async () => null,
      importDialog: async () => null,
      importDumps: async () => 0,
      clipboardWrite: async () => {},
    }

export function App() {
  const { vaultState, recentVaults, isLoading: vaultLoading, error: vaultError, createVault, openVault } = useVault()

  // If no vault is open, show WelcomeScreen (VAULT-01, FILE-02)
  if (!vaultState.isOpen) {
    return (
      <WelcomeScreen
        vaultState={vaultState}
        recentVaults={recentVaults}
        isLoading={vaultLoading}
        error={vaultError}
        onCreateVault={createVault}
        onOpenVault={openVault}
      />
    )
  }

  // Vault is open - render main app with VaultPlaceholder
  // Note: DumpInput hidden per D-10 - it will be shown in Phase 2
  const { dumps, submitDump, deleteDump, isLoading, error } = useDump()
  const { projects, activeProjectId, setActiveProject, createProject, updateProject, deleteProject } = useProjects()
  const { tags, createTag, deleteTag, getAISuggestions } = useTags()
  const { filters, setProjectFilter, toggleTagFilter, setTimeRangeFilter, setSortBy, applyFilters } = useFilter()
  const { searchQuery, setSearchQuery, search } = useSearch()
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [dumpOrder, setDumpOrder] = useState<string[]>([])
  const [currentDumpText, setCurrentDumpText] = useState('')

  // Phase 4: View state (either 'grid' or 'summaries')
  const [currentView, setCurrentView] = useState<'grid' | 'summaries'>('grid')

  // Phase 4: Switch to summaries view
  const handleSummariesClick = useCallback(() => {
    setCurrentView('summaries')
  }, [])

  // Compute search results when searchQuery or dumps change
  const searchResults = useMemo(() => {
    return search(searchQuery, dumps)
  }, [searchQuery, dumps, search])

  // Load dumpOrder on mount from api.getDumpOrder()
  useEffect(() => {
    const loadDumpOrder = async () => {
      try {
        const order = await api.getDumpOrder()
        setDumpOrder(order)
      } catch (err) {
        console.error('Failed to load dump order:', err)
      }
    }
    loadDumpOrder()
  }, [])

  // Handlers
  const handleProjectSelect = (projectId: string | null) => {
    setActiveProject(projectId)
    setProjectFilter(projectId)
  }

  const handleTagToggle = (tagId: string) => {
    toggleTagFilter(tagId)
    // Also update selectedTagIds for TagInput
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  const handleReorder = (newDumps: DumpEntry[]) => {
    const newOrder = newDumps.map(d => d.id)
    setDumpOrder(newOrder)
    api.setDumpOrder(newOrder)
  }

  const handleSubmit = async (text: string, filePaths: string[], projectId: string | null, tagIds: string[]) => {
    await submitDump(text, filePaths, projectId, tagIds)
    setSelectedTagIds([])
  }

  // For updating dump project/tags:
  const handleDumpProjectChange = (dumpId: string, projectId: string | null) => {
    // Call IPC directly to update dump
    api.updateDump(dumpId, { projectId })
  }

  const handleDumpTagsChange = (dumpId: string, tagIds: string[]) => {
    // Call IPC directly to update dump
    api.updateDump(dumpId, { tags: tagIds })
  }

  const handleExportProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (!project) return

    // Get dumps for this project
    const projectDumps = dumps.filter(d => d.projectId === projectId)
    if (projectDumps.length === 0) {
      alert('No dumps in this project to export')
      return
    }

    // Open save dialog
    const savePath = await api.exportSaveDialog(`${project.name}.zip`)
    if (!savePath) return

    // Export
    const result = await api.exportDumps(projectDumps.map(d => d.id), project.name, savePath)
    if (result) {
      alert('Export successful!')
    }
  }

  const handleImportProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (!project) return

    // Show confirmation per UI-SPEC.md
    const confirmed = window.confirm(
      `Import to Project: Dumps will be added to ${project.name}. Existing dumps will not be affected. Continue?`
    )
    if (!confirmed) return

    // Open file picker
    const zipPath = await api.importDialog()
    if (!zipPath) return

    // Import
    const count = await api.importDumps(zipPath, projectId)
    alert(`Imported ${count} dumps to ${project.name}`)
  }

  const handleExportSelected = async (dumpIds: string[]) => {
    if (dumpIds.length === 0) return
    // Open save dialog
    const savePath = await api.exportSaveDialog(`export-${Date.now()}.zip`)
    if (!savePath) return
    // Export
    const result = await api.exportDumps(dumpIds, 'export', savePath)
    if (result) {
      alert(`Exported ${dumpIds.length} dumps`)
    }
  }

  return (
    <AppShell sidebar={
      <Sidebar
        projects={projects}
        tags={tags}
        activeProjectId={activeProjectId}
        selectedTagIds={filters.tagIds}
        timeRange={filters.timeRange}
        onProjectSelect={handleProjectSelect}
        onTagToggle={handleTagToggle}
        onTimeRangeChange={setTimeRangeFilter}
        onCreateProject={createProject}
        onUpdateProject={updateProject}
        onDeleteProject={deleteProject}
        onExportProject={handleExportProject}
        onImportProject={handleImportProject}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSummariesClick={handleSummariesClick}
        isSummariesActive={currentView === 'summaries'}
      />
    }>
      {/* Error display */}
      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-md text-sm"
          style={{
            backgroundColor: 'var(--destructive)',
            color: 'white'
          }}
        >
          {error}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <VaultPlaceholder vaultName={vaultState.vaultName} />
      </div>

      {/* DumpInput hidden until Phase 2 */}
    </AppShell>
  )
}

export default App
