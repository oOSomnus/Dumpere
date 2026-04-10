import { useState, useMemo, useCallback, useDeferredValue } from 'react'
import { AppShell } from './components/AppShell'
import { Sidebar } from './components/Sidebar'
import { DumpInput } from './components/DumpInput'
import { CardGrid } from './components/CardGrid'
import { SummaryPanel } from './components/SummaryPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { InsertReferenceDialog, type ReferenceTargetOption } from './components/InsertReferenceDialog'
import { useDump } from './hooks/useDump'
import { useProjects } from './hooks/useProjects'
import { useTags } from './hooks/useTags'
import { useFilter } from './hooks/useFilter'
import { useSearch } from './hooks/useSearch'
import { useVault } from './hooks/useVault'
import { useTheme } from './hooks/useTheme'
import { WelcomeScreen } from './components/WelcomeScreen'
import { DumpEntry, WorkspaceNode } from './lib/types'
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
      getWorkspaceTree: async () => [],
      readWorkspaceNote: async (projectId: string, notePath: string) => ({ projectId, path: notePath, content: '', updatedAt: 0 }),
      updateWorkspaceNote: async (projectId: string, notePath: string, content: string) => ({ projectId, path: notePath, content, updatedAt: Date.now() }),
    }

interface VaultAppContentProps {
  vaultName: string | null
  onBackToVaults: () => Promise<void> | void
}

type AppView = 'grid' | 'summaries' | 'settings'

function collectWorkspaceNoteOptions(nodes: WorkspaceNode[], parentPath = ''): ReferenceTargetOption[] {
  return nodes.flatMap((node) => {
    const nextPath = parentPath ? `${parentPath}/${node.name}` : node.name

    if (node.type === 'note') {
      return [{
        path: node.path,
        label: nextPath
      }]
    }

    return collectWorkspaceNoteOptions(node.children || [], nextPath)
  })
}

function VaultAppContent({ vaultName, onBackToVaults }: VaultAppContentProps) {
  // Mount all vault-only hooks in a dedicated subtree so the parent
  // component keeps a stable Hooks order while switching screens.
  const { dumps, submitDump, deleteDump, updateDump, stripTagFromDumps, isLoading, error } = useDump()
  const { projects, activeProjectId, setActiveProject, createProject, updateProject, deleteProject } = useProjects()
  const { tags, createTag, deleteTag, getAISuggestions } = useTags()
  const { filters, setProjectFilter, toggleTagFilter, setDatePreset, toggleDate, setDateKeys, clearDateFilter, applyFilters } = useFilter()
  const { searchQuery, setSearchQuery, search } = useSearch()
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false)
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const [currentView, setCurrentView] = useState<AppView>('grid')
  const [activeWorkspaceNotes, setActiveWorkspaceNotes] = useState<Record<string, string>>({})
  const [isInsertDialogOpen, setIsInsertDialogOpen] = useState(false)
  const [quoteSelection, setQuoteSelection] = useState<DumpEntry[]>([])
  const [quoteTargetProjectId, setQuoteTargetProjectId] = useState<string | null>(null)
  const [quoteTargetNotePath, setQuoteTargetNotePath] = useState<string | null>(null)
  const [quoteTargetNotes, setQuoteTargetNotes] = useState<ReferenceTargetOption[]>([])
  const [isLoadingQuoteTargetNotes, setIsLoadingQuoteTargetNotes] = useState(false)

  const handleViewChange = useCallback((view: AppView) => {
    setCurrentView(view)
  }, [])

  const loadQuoteTargetNotes = useCallback(async (projectId: string) => {
    setIsLoadingQuoteTargetNotes(true)

    try {
      const tree = await api.getWorkspaceTree(projectId)
      const noteOptions = collectWorkspaceNoteOptions(tree)
      setQuoteTargetNotes(noteOptions)

      const preferredPath = activeWorkspaceNotes[projectId]
      const nextPath = (
        noteOptions.find(note => note.path === preferredPath)?.path ??
        noteOptions[0]?.path ??
        null
      )

      setQuoteTargetNotePath(nextPath)
      return noteOptions
    } finally {
      setIsLoadingQuoteTargetNotes(false)
    }
  }, [activeWorkspaceNotes])

  // Compute search results when searchQuery or dumps change
  const searchResults = useMemo(() => {
    return search(deferredSearchQuery, dumps)
  }, [deferredSearchQuery, dumps, search])

  // Handlers
  const handleSidebarProjectSelect = (projectId: string | null) => {
    const nextProjectFilterId = filters.projectId === projectId ? null : projectId
    setCurrentView('grid')

    if (projectId) {
      setActiveProject(projectId)
    }

    setProjectFilter(nextProjectFilterId)
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

  const handleInsertDumpReferences = async (selectedDumps: DumpEntry[]) => {
    if (selectedDumps.length === 0) return

    if (projects.length === 0) {
      alert('Create a project before inserting dump references into a note.')
      return
    }

    const projectIdsInSelection = Array.from(new Set(
      selectedDumps
        .map(dump => dump.projectId)
        .filter((projectId): projectId is string => Boolean(projectId))
    ))

    const defaultProjectId = (
      projectIdsInSelection.length === 1
        ? projectIdsInSelection[0]
        : activeProjectId && projects.some(project => project.id === activeProjectId)
          ? activeProjectId
          : projects[0]?.id ?? null
    )

    if (!defaultProjectId) {
      alert('Create a project before inserting dump references into a note.')
      return
    }

    setQuoteSelection(selectedDumps)
    setQuoteTargetProjectId(defaultProjectId)
    setIsInsertDialogOpen(true)
    await loadQuoteTargetNotes(defaultProjectId)
  }

  const handleQuoteProjectChange = useCallback((projectId: string) => {
    setQuoteTargetProjectId(projectId)
    void loadQuoteTargetNotes(projectId)
  }, [loadQuoteTargetNotes])

  const handleInsertDialogOpenChange = useCallback((open: boolean) => {
    setIsInsertDialogOpen(open)

    if (!open) {
      setQuoteSelection([])
      setQuoteTargetNotes([])
      setQuoteTargetProjectId(null)
      setQuoteTargetNotePath(null)
    }
  }, [])

  const handleConfirmInsertDumpReferences = useCallback(async () => {
    if (!quoteTargetProjectId || !quoteTargetNotePath || quoteSelection.length === 0) {
      return
    }

    const currentNote = await api.readWorkspaceNote(quoteTargetProjectId, quoteTargetNotePath)
    const referenceContent = formatDumpReferences(quoteSelection)
    await api.updateWorkspaceNote(
      quoteTargetProjectId,
      quoteTargetNotePath,
      appendMarkdownSection(currentNote.content, referenceContent)
    )

    setActiveWorkspaceNotes(prev => ({
      ...prev,
      [quoteTargetProjectId]: quoteTargetNotePath
    }))
    handleInsertDialogOpenChange(false)
  }, [handleInsertDialogOpenChange, quoteSelection, quoteTargetNotePath, quoteTargetProjectId])

  const handleActiveNotePathChange = useCallback((projectId: string, notePath: string) => {
    setActiveWorkspaceNotes(prev => ({ ...prev, [projectId]: notePath }))
  }, [])

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
        onSearchFocusChange={setIsSearchInputFocused}
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
        <div className="px-6 py-4 flex items-center justify-between gap-4 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          <span>{vaultName ? `Vault opened: ${vaultName}` : 'Vault opened'}</span>
          <button
            type="button"
            onClick={() => void onBackToVaults()}
            className="rounded-lg px-3 py-1.5 transition-colors hover:bg-accent"
            style={{
              color: 'var(--foreground)',
              backgroundColor: 'var(--secondary)'
            }}
          >
            Back to Vaults
          </button>
        </div>

        <div className="px-6 pb-6">
          {currentView === 'summaries' ? (
            <SummaryPanel
              projects={projects}
              dumps={dumps}
              tags={tags}
              activeProjectId={activeProjectId}
              activeNotePaths={activeWorkspaceNotes}
              onActiveNotePathChange={handleActiveNotePathChange}
              onProjectChange={handleDumpProjectChange}
              onTagsChange={handleDumpTagsChange}
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
              onQuoteSelected={handleInsertDumpReferences}
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
          shouldAutoFocus={!isSearchInputFocused}
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

      <InsertReferenceDialog
        open={isInsertDialogOpen}
        projects={projects}
        selectedProjectId={quoteTargetProjectId}
        selectedNotePath={quoteTargetNotePath}
        noteOptions={quoteTargetNotes}
        isLoadingNotes={isLoadingQuoteTargetNotes}
        onProjectChange={handleQuoteProjectChange}
        onNoteChange={setQuoteTargetNotePath}
        onConfirm={handleConfirmInsertDumpReferences}
        onOpenChange={handleInsertDialogOpenChange}
      />
    </AppShell>
  )
}

export function App() {
  useTheme()
  const { vaultState, recentVaults, isLoading: vaultLoading, error: vaultError, createVault, openVault, closeVault } = useVault()

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

  return <VaultAppContent vaultName={vaultState.vaultName} onBackToVaults={closeVault} />
}

export default App
