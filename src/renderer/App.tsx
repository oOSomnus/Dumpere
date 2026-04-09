import { useState, useMemo, useCallback, useDeferredValue } from 'react'
import { AppShell } from './components/AppShell'
import { Sidebar } from './components/Sidebar'
import { DumpInput } from './components/DumpInput'
import { CardGrid } from './components/CardGrid'
import { SummaryPanel } from './components/SummaryPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { useDump } from './hooks/useDump'
import { useProjects } from './hooks/useProjects'
import { useTags } from './hooks/useTags'
import { useFilter } from './hooks/useFilter'
import { useSearch } from './hooks/useSearch'
import { useVault } from './hooks/useVault'
import { WelcomeScreen } from './components/WelcomeScreen'
import { DumpEntry } from './lib/types'
import { appendMarkdownSection, formatDumpReferences } from './lib/workpad-utils'

const api = typeof window !== 'undefined' && window.electronAPI
  ? window.electronAPI
  : {
      updateDump: async (id: string, updates: { projectId?: string | null; tags?: string[] }) => ({ id, text: '', files: [], createdAt: Date.now(), updatedAt: Date.now(), projectId: null, tags: [], ...updates }),
      exportSaveDialog: async () => null,
      exportDumps: async () => null,
      importDialog: async () => null,
      importDumps: async () => 0,
      clipboardWrite: async () => {},
      getWorkpad: async (projectId: string | null) => ({ projectId, content: '', updatedAt: 0 }),
      updateWorkpad: async (projectId: string | null, content: string) => ({ projectId, content, updatedAt: Date.now() }),
    }

interface VaultAppContentProps {
  vaultName: string | null
}

type AppView = 'grid' | 'summaries' | 'settings'

function VaultAppContent({ vaultName }: VaultAppContentProps) {
  // Mount all vault-only hooks in a dedicated subtree so the parent
  // component keeps a stable Hooks order while switching screens.
  const { dumps, submitDump, deleteDump, updateDump, stripTagFromDumps, isLoading, error } = useDump()
  const { projects, activeProjectId, setActiveProject, createProject, updateProject, deleteProject } = useProjects()
  const { tags, createTag, deleteTag, getAISuggestions } = useTags()
  const { filters, setProjectFilter, toggleTagFilter, setDatePreset, toggleDate, setDateKeys, clearDateFilter, applyFilters } = useFilter()
  const { searchQuery, setSearchQuery, search } = useSearch()
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const [currentView, setCurrentView] = useState<AppView>('grid')

  const handleViewChange = useCallback((view: AppView) => {
    setCurrentView(view)
  }, [])

  // Compute search results when searchQuery or dumps change
  const searchResults = useMemo(() => {
    return search(deferredSearchQuery, dumps)
  }, [deferredSearchQuery, dumps, search])

  // Handlers
  const handleSidebarProjectSelect = (projectId: string | null) => {
    const nextProjectId = filters.projectId === projectId ? null : projectId
    setCurrentView('grid')
    setActiveProject(nextProjectId)
    setProjectFilter(projectId)
  }

  const handleComposerProjectSelect = (projectId: string | null) => {
    if (!projectId) return

    setCurrentView('grid')
    setActiveProject(projectId)
    if (filters.projectId !== projectId) {
      setProjectFilter(projectId)
    }
  }

  const handleTagToggle = (tagId: string) => {
    setCurrentView('grid')
    toggleTagFilter(tagId)
  }

  const handleDeleteTag = async (tagId: string) => {
    await deleteTag(tagId)

    if (filters.tagIds.includes(tagId)) {
      toggleTagFilter(tagId)
    }

    setSelectedTagIds(prev => prev.filter(existingTagId => existingTagId !== tagId))
    stripTagFromDumps(tagId)
  }

  const handleSubmit = async (text: string, filePaths: string[], projectId: string | null, tagIds: string[]) => {
    await submitDump(text, filePaths, projectId, tagIds)
    setSelectedTagIds([])
  }

  // For updating dump project/tags:
  const handleDumpProjectChange = (dumpId: string, projectId: string | null) => {
    void updateDump(dumpId, { projectId })
  }

  const handleDumpTagsChange = (dumpId: string, tagIds: string[]) => {
    void updateDump(dumpId, { tags: tagIds })
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

  const handleQuoteToWorkpad = async (selectedDumps: DumpEntry[]) => {
    if (selectedDumps.length === 0) return
    const currentWorkpad = await api.getWorkpad(activeProjectId)
    const quotedContent = formatDumpReferences(selectedDumps)
    await api.updateWorkpad(
      activeProjectId,
      appendMarkdownSection(currentWorkpad.content, quotedContent)
    )
  }

  return (
    <AppShell sidebar={
      <Sidebar
        projects={projects}
        tags={tags}
        activeProjectId={filters.projectId}
        selectedTagIds={filters.tagIds}
        dateFilter={filters.dateFilter}
        onProjectSelect={handleSidebarProjectSelect}
        onTagToggle={handleTagToggle}
        onDeleteTag={handleDeleteTag}
        onDatePresetChange={(preset) => {
          setCurrentView('grid')
          setDatePreset(preset)
        }}
        onToggleDate={(dateKey) => {
          setCurrentView('grid')
          toggleDate(dateKey)
        }}
        onSetDateKeys={(dateKeys) => {
          setCurrentView('grid')
          setDateKeys(dateKeys)
        }}
        onClearDateFilter={() => {
          setCurrentView('grid')
          clearDateFilter()
        }}
        onCreateProject={createProject}
        onUpdateProject={updateProject}
        onDeleteProject={deleteProject}
        onExportProject={handleExportProject}
        onImportProject={handleImportProject}
        searchQuery={searchQuery}
        onSearchChange={(query) => {
          setCurrentView('grid')
          setSearchQuery(query)
        }}
        currentView={currentView}
        onViewChange={handleViewChange}
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
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: '64px' }}
      >
        <div className="px-6 py-4 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {vaultName ? `Vault opened: ${vaultName}` : 'Vault opened'}
        </div>

        <div className="px-6 pb-6">
          {currentView === 'summaries' ? (
            <SummaryPanel
              projects={projects}
              activeProjectId={activeProjectId}
              onBackToDumps={() => setCurrentView('grid')}
              onOpenSettings={() => setCurrentView('settings')}
            />
          ) : currentView === 'settings' ? (
            <SettingsPanel onBackToDumps={() => setCurrentView('grid')} />
          ) : (
            <CardGrid
              dumps={dumps}
              onDelete={deleteDump}
              isLoading={isLoading}
              filters={filters}
              applyFilters={applyFilters}
              searchResults={searchResults}
              searchQuery={deferredSearchQuery}
              onExportSelected={handleExportSelected}
              onQuoteSelected={handleQuoteToWorkpad}
              projects={projects}
              tags={tags}
              onProjectChange={handleDumpProjectChange}
              onTagsChange={handleDumpTagsChange}
            />
          )}
        </div>
      </div>

      {currentView === 'grid' && (
        <DumpInput
          onSubmit={handleSubmit}
          projects={projects}
          activeProjectId={activeProjectId}
          onProjectSelect={handleComposerProjectSelect}
          allTags={tags}
          selectedTagIds={selectedTagIds}
          onTagsChange={setSelectedTagIds}
          getAISuggestions={getAISuggestions}
          onCreateTag={createTag}
        />
      )}
    </AppShell>
  )
}

export function App() {
  const { vaultState, recentVaults, isLoading: vaultLoading, error: vaultError, createVault, openVault } = useVault()

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

  return <VaultAppContent vaultName={vaultState.vaultName} />
}

export default App
