import { useState, useEffect, useCallback } from 'react'
import { useTheme } from './hooks/useTheme'
import { useVault } from './hooks/useVault'
import { useAppController } from './hooks/useAppController'
import { useDumpReferenceInsertion } from './hooks/useDumpReferenceInsertion'
import { AppShell } from './components/AppShell'
import { Sidebar } from './components/Sidebar'
import { DumpInput } from './components/DumpInput'
import { CardGrid } from './components/CardGrid'
import { SummaryPanel } from './components/SummaryPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { InsertReferenceDialog } from './components/InsertReferenceDialog'
import { WelcomeScreen } from './components/WelcomeScreen'
import { PromptProvider } from './components/PromptProvider'
import { I18nProvider, useI18n } from './i18n'
import { getElectronAPI } from './lib/electron-api'

interface VaultAppContentProps {
  vaultName: string | null
  isDark: boolean
  themeLoaded: boolean
  onToggleTheme: (checked?: boolean) => Promise<void>
  onBackToVaults: () => Promise<void> | void
}

function VaultAppContent({
  vaultName,
  isDark,
  themeLoaded,
  onToggleTheme,
  onBackToVaults
}: VaultAppContentProps) {
  const app = useAppController()
  const { t } = useI18n()
  const dumpReferenceInsertion = useDumpReferenceInsertion({
    projects: app.projects,
    activeProjectId: app.activeProjectId
  })
  const api = getElectronAPI()

  // Panel sizes state with persistence
  const [panelSizes, setPanelSizes] = useState({ sidebarWidth: 240, inputHeight: 60 })

  // Load persisted panel sizes on mount
  useEffect(() => {
    api.ui.getPanelSizes().then(sizes => {
      setPanelSizes(sizes)
    }).catch(() => {
      // Use defaults if loading fails
    })
  }, [])

  const handleSidebarWidthChange = useCallback((width: number) => {
    setPanelSizes(prev => ({ ...prev, sidebarWidth: width }))
    api.ui.setPanelSizes({ sidebarWidth: width })
  }, [])

  const handleInputHeightChange = useCallback((height: number) => {
    setPanelSizes(prev => ({ ...prev, inputHeight: height }))
    api.ui.setPanelSizes({ inputHeight: height })
  }, [])

  const handleReset = useCallback(() => {
    const defaults = { sidebarWidth: 240, inputHeight: 60 }
    setPanelSizes(defaults)
    api.ui.setPanelSizes(defaults)
  }, [])

  return (
    <AppShell
      sidebarWidth={panelSizes.sidebarWidth}
      onSidebarWidthChange={handleSidebarWidthChange}
      onReset={handleReset}
      sidebar={
        <Sidebar
        projects={app.projects}
        tags={app.tags}
        activeProjectId={app.filters.projectId}
        selectedTagIds={app.filters.tagIds}
        dateFilter={app.filters.dateFilter}
        onProjectSelect={app.handleSidebarProjectSelect}
        onTagToggle={app.handleTagToggle}
        onDeleteTag={app.handleDeleteTag}
        onDatePresetChange={app.handleDatePresetChange}
        onToggleDate={app.handleToggleDate}
        onSetDateKeys={app.handleSetDateKeys}
        onClearDateFilter={app.handleClearDateFilter}
        onCreateProject={app.createProject}
        onUpdateProject={app.updateProject}
        onDeleteProject={app.deleteProject}
        onExportProject={app.handleExportProject}
        onImportProject={app.handleImportProject}
        searchQuery={app.searchQuery}
        onSearchFocusChange={app.handleSearchFocusChange}
        onSearchChange={app.handleSearchChange}
        currentView={app.currentView}
        onViewChange={app.handleViewChange}
      />
    }>
      {app.error && (
        <div
          className="mb-4 px-4 py-3 rounded-md text-sm"
          style={{
            backgroundColor: 'var(--destructive)',
            color: 'white'
          }}
        >
          {app.error}
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: '64px' }}
      >
        <div className="px-6 py-4 flex items-center justify-between gap-4 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          <span>{vaultName ? t('app.vaultOpened', { name: vaultName }) : t('app.vaultOpenedUnnamed')}</span>
          <button
            type="button"
            onClick={() => void onBackToVaults()}
            className="rounded-lg px-3 py-1.5 transition-colors hover:bg-accent"
            style={{
              color: 'var(--foreground)',
              backgroundColor: 'var(--secondary)'
            }}
          >
            {t('app.backToVaults')}
          </button>
        </div>

        <div className="px-6 pb-6">
          {app.currentView === 'summaries' ? (
            <SummaryPanel
              projects={app.projects}
              dumps={app.dumps}
              tags={app.tags}
              activeProjectId={app.activeProjectId}
              activeNotePaths={dumpReferenceInsertion.activeWorkspaceNotes}
              onActiveNotePathChange={dumpReferenceInsertion.handleActiveNotePathChange}
              onProjectChange={app.handleDumpProjectChange}
              onTagsChange={app.handleDumpTagsChange}
              onBackToDumps={() => app.handleViewChange('grid')}
              onOpenSettings={() => app.handleViewChange('settings')}
            />
          ) : app.currentView === 'settings' ? (
            <SettingsPanel
              isDark={isDark}
              themeLoaded={themeLoaded}
              onToggleTheme={onToggleTheme}
              onBackToDumps={() => app.handleViewChange('grid')}
            />
          ) : (
            <CardGrid
              dumps={app.dumps}
              onDelete={app.deleteDump}
              isLoading={app.isLoading}
              filters={app.filters}
              applyFilters={app.applyFilters}
              searchResults={app.searchResults}
              searchQuery={app.deferredSearchQuery}
              onExportSelected={app.handleExportSelected}
              onQuoteSelected={dumpReferenceInsertion.openDialogForSelection}
              projects={app.projects}
              tags={app.tags}
              onProjectChange={app.handleDumpProjectChange}
              onTagsChange={app.handleDumpTagsChange}
            />
          )}
        </div>
      </div>

      {app.currentView === 'grid' && (
        <DumpInput
          onSubmit={app.handleSubmit}
          shouldAutoFocus={app.shouldAutoFocusComposer}
          projects={app.projects}
          activeProjectId={app.activeProjectId}
          onProjectSelect={app.handleComposerProjectSelect}
          allTags={app.tags}
          selectedTagIds={app.selectedTagIds}
          onTagsChange={app.setSelectedTagIds}
          getAISuggestions={app.getAISuggestions}
          onCreateTag={app.createTag}
          inputHeight={panelSizes.inputHeight}
          onInputHeightChange={handleInputHeightChange}
          leftOffset={panelSizes.sidebarWidth}
        />
      )}

      <InsertReferenceDialog
        open={dumpReferenceInsertion.isDialogOpen}
        projects={app.projects}
        selectedProjectId={dumpReferenceInsertion.selectedProjectId}
        selectedNotePath={dumpReferenceInsertion.selectedNotePath}
        noteOptions={dumpReferenceInsertion.noteOptions}
        isLoadingNotes={dumpReferenceInsertion.isLoadingNotes}
        onProjectChange={dumpReferenceInsertion.handleProjectChange}
        onNoteChange={dumpReferenceInsertion.handleNoteChange}
        onConfirm={dumpReferenceInsertion.confirmInsert}
        onOpenChange={dumpReferenceInsertion.handleOpenChange}
      />
    </AppShell>
  )
}

export function App() {
  const theme = useTheme()
  const { vaultState, recentVaults, isLoading: vaultLoading, error: vaultError, createVault, openVault, closeVault } = useVault()

  return (
    <I18nProvider>
      {!vaultState.isOpen ? (
        <WelcomeScreen
          vaultState={vaultState}
          recentVaults={recentVaults}
          isLoading={vaultLoading}
          error={vaultError}
          onCreateVault={createVault}
          onOpenVault={openVault}
        />
      ) : (
        <PromptProvider>
          <VaultAppContent
            vaultName={vaultState.vaultName}
            isDark={theme.isDark}
            themeLoaded={theme.isLoaded}
            onToggleTheme={theme.toggleTheme}
            onBackToVaults={closeVault}
          />
        </PromptProvider>
      )}
    </I18nProvider>
  )
}

export default App
