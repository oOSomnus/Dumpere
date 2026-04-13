import type { Project, DumpEntry, Tag } from '@/shared/types'
import { useSummaryPanelController } from '../hooks/useSummaryPanelController'
import { cn } from '@/shared/cn'
import {
  ArrowLeft
} from 'lucide-react'
import { ExpandedCard } from './ExpandedCard'
import { SummaryHistorySection } from './summary-panel/SummaryHistorySection'
import { SummaryProjectToolbar } from './summary-panel/SummaryProjectToolbar'
import { SummaryWorkspaceSection } from './summary-panel/SummaryWorkspaceSection'
import { useI18n } from '../i18n'

interface SummaryPanelProps {
  projects: Project[]
  dumps: DumpEntry[]
  tags: Tag[]
  activeProjectId: string | null
  activeNotePaths: Record<string, string>
  onActiveNotePathChange: (projectId: string, notePath: string) => void
  onProjectChange: (dumpId: string, projectId: string | null) => void
  onTagsChange: (dumpId: string, tagIds: string[]) => void
  onBackToDumps?: () => void
  onOpenSettings?: () => void
}

export function SummaryPanel({
  projects,
  dumps,
  tags,
  activeProjectId,
  activeNotePaths,
  onActiveNotePathChange,
  onProjectChange,
  onTagsChange,
  onBackToDumps,
  onOpenSettings
}: SummaryPanelProps) {
  const { t } = useI18n()
  const {
    summaryType,
    setSummaryType,
    selectedProjectId,
    handleProjectSelectionChange,
    workspaceMode,
    setWorkspaceMode,
    copied,
    selectedDump,
    setSelectedDump,
    currentSummary,
    setCurrentSummary,
    filteredSummaries,
    projectName,
    dumpMap,
    tree,
    effectiveNotePath,
    note,
    noteContent,
    setNoteContent,
    isLoading,
    error,
    clearError,
    isWorkspaceLoading,
    workspaceError,
    isNoteLoading,
    isNoteSaving,
    noteError,
    handleGenerate,
    handleExport,
    handleCopySummary,
    handleCreateFolder,
    handleCreateNote,
    handleRenameEntryWithName,
    handleDeleteEntry
  } = useSummaryPanelController({
    projects,
    dumps,
    activeProjectId,
    activeNotePaths,
    onActiveNotePathChange
  })

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>
            {t('summary.title')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {t('summary.subtitle')}
          </p>
        </div>

        {onBackToDumps && (
          <button
            onClick={onBackToDumps}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              'hover:opacity-90'
            )}
            style={{
              backgroundColor: 'var(--secondary)',
              color: 'var(--secondary-foreground)'
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t('summary.backToDumps')}
          </button>
        )}
      </div>

      <SummaryProjectToolbar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectSelectionChange={handleProjectSelectionChange}
      />

      <div className="flex flex-col gap-6 flex-1 min-h-0">
        <SummaryWorkspaceSection
          selectedProjectId={selectedProjectId}
          projectName={projectName ?? ''}
          workspaceMode={workspaceMode}
          setWorkspaceMode={setWorkspaceMode}
          isNoteSaving={isNoteSaving}
          note={note}
          workspaceError={workspaceError}
          noteError={noteError}
          isWorkspaceLoading={isWorkspaceLoading}
          tree={tree}
          effectiveNotePath={effectiveNotePath}
          onNoteSelect={(path) => selectedProjectId && onActiveNotePathChange(selectedProjectId, path)}
          handleCreateFolder={handleCreateFolder}
          handleCreateNote={handleCreateNote}
          handleRenameEntryWithName={handleRenameEntryWithName}
          handleDeleteEntry={handleDeleteEntry}
          isNoteLoading={isNoteLoading}
          noteContent={noteContent}
          setNoteContent={setNoteContent}
          dumpMap={dumpMap}
          setSelectedDump={setSelectedDump}
        />

        <SummaryHistorySection
          summaryType={summaryType}
          setSummaryType={setSummaryType}
          handleGenerate={handleGenerate}
          isLoading={isLoading}
          isNoteLoading={isNoteLoading}
          currentSummary={currentSummary}
          handleExport={handleExport}
          handleCopySummary={handleCopySummary}
          copied={copied}
          error={error}
          clearError={clearError}
          onOpenSettings={onOpenSettings}
          filteredSummaries={filteredSummaries}
          setCurrentSummary={setCurrentSummary}
          projectName={projectName}
        />
      </div>

      <ExpandedCard
        dump={selectedDump}
        onClose={() => setSelectedDump(null)}
        projects={projects}
        tags={tags}
        onProjectChange={onProjectChange}
        onTagsChange={onTagsChange}
      />
    </div>
  )
}
