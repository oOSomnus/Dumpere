import { Columns2, Eye, FileText, PencilLine } from 'lucide-react'
import type { DumpEntry, WorkspaceNode, WorkspaceNote } from '@/shared/types'
import { formatRelativeTime } from '@/renderer/lib/utils-time'
import { MarkdownPreview } from '@/renderer/components/MarkdownPreview'
import { WorkspaceTree } from '@/renderer/components/WorkspaceTree'
import { useI18n } from '@/renderer/i18n'

type WorkspaceMode = 'edit' | 'split' | 'preview'

interface SummaryWorkspaceSectionProps {
  selectedProjectId: string | null
  projectName: string | null
  workspaceMode: WorkspaceMode
  setWorkspaceMode: (mode: WorkspaceMode) => void
  isNoteSaving: boolean
  note: WorkspaceNote | null
  workspaceError: string | null
  noteError: string | null
  isWorkspaceLoading: boolean
  tree: WorkspaceNode[]
  effectiveNotePath: string | null
  onNoteSelect: (path: string) => void
  handleCreateFolder: (parentPath: string) => Promise<WorkspaceNode | null>
  handleCreateNote: (parentPath: string) => Promise<WorkspaceNote | null>
  handleRenameEntryWithName: (path: string, nextName: string) => Promise<void>
  handleDeleteEntry: (path: string) => Promise<void>
  isNoteLoading: boolean
  noteContent: string
  setNoteContent: (content: string) => void
  dumpMap: Map<string, DumpEntry>
  setSelectedDump: (dump: DumpEntry | null) => void
}

export function SummaryWorkspaceSection({
  selectedProjectId,
  projectName,
  workspaceMode,
  setWorkspaceMode,
  isNoteSaving,
  note,
  workspaceError,
  noteError,
  isWorkspaceLoading,
  tree,
  effectiveNotePath,
  onNoteSelect,
  handleCreateFolder,
  handleCreateNote,
  handleRenameEntryWithName,
  handleDeleteEntry,
  isNoteLoading,
  noteContent,
  setNoteContent,
  dumpMap,
  setSelectedDump
}: SummaryWorkspaceSectionProps) {
  const { t, resolvedLocale } = useI18n()
  return (
    <section
      className="rounded-2xl border p-5 flex flex-col gap-4 min-h-0 flex-1"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            {t('summary.workspace')}
          </h2>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {projectName}
          </p>
        </div>

        {selectedProjectId && (
          <div className="inline-flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => setWorkspaceMode('edit')}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm"
              style={{
                backgroundColor: workspaceMode === 'edit' ? 'var(--accent)' : 'transparent',
                color: workspaceMode === 'edit' ? 'var(--accent-foreground)' : 'var(--foreground)'
              }}
            >
              <PencilLine className="w-4 h-4" />
              {t('summary.edit')}
            </button>
            <button
              onClick={() => setWorkspaceMode('split')}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm"
              style={{
                backgroundColor: workspaceMode === 'split' ? 'var(--accent)' : 'transparent',
                color: workspaceMode === 'split' ? 'var(--accent-foreground)' : 'var(--foreground)'
              }}
            >
              <Columns2 className="w-4 h-4" />
              {t('summary.split')}
            </button>
            <button
              onClick={() => setWorkspaceMode('preview')}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm"
              style={{
                backgroundColor: workspaceMode === 'preview' ? 'var(--accent)' : 'transparent',
                color: workspaceMode === 'preview' ? 'var(--accent-foreground)' : 'var(--foreground)'
              }}
            >
              <Eye className="w-4 h-4" />
              {t('summary.preview')}
            </button>
          </div>
        )}
      </div>

      {selectedProjectId ? (
        <>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            <span>{isNoteSaving ? t('common.saving') : t('common.savedLocally')}</span>
            {note?.updatedAt ? <span>{t('common.updatedAgo', { time: formatRelativeTime(note.updatedAt, resolvedLocale) })}</span> : null}
            {note?.path ? <span>{note.path}</span> : null}
          </div>

          {(workspaceError || noteError) && (
            <div
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--destructive)',
                color: 'var(--destructive-foreground)'
              }}
            >
              {workspaceError || noteError}
            </div>
          )}

          <div className="grid min-h-[520px] gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div
              className="rounded-xl border p-3 overflow-y-auto"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--secondary)' }}
            >
              {isWorkspaceLoading ? (
                <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  {t('summary.loadingWorkspace')}
                </div>
              ) : (
                <WorkspaceTree
                  tree={tree}
                  selectedPath={effectiveNotePath}
                  onSelect={onNoteSelect}
                  onCreateFolder={handleCreateFolder}
                  onCreateNote={handleCreateNote}
                  onRename={handleRenameEntryWithName}
                  onDelete={handleDeleteEntry}
                />
              )}
            </div>

            {isNoteLoading ? (
              <div className="flex items-center justify-center rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  {t('summary.loadingNote')}
                </span>
              </div>
            ) : !effectiveNotePath ? (
              <div
                className="flex items-center justify-center rounded-xl border p-6 text-center"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--secondary)' }}
              >
                <div>
                  <FileText className="mx-auto mb-3 h-10 w-10" style={{ color: 'var(--muted-foreground)' }} />
                  <p className="text-base font-medium" style={{ color: 'var(--foreground)' }}>
                    {t('summary.noNotes')}
                  </p>
                  <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    {t('summary.createNoteHelp')}
                  </p>
                </div>
              </div>
            ) : workspaceMode === 'edit' ? (
              <textarea
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
                placeholder={t('summary.notePlaceholder')}
                className="w-full resize-none rounded-xl border p-4 text-sm outline-none"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--secondary)',
                  color: 'var(--foreground)',
                  minHeight: '520px'
                }}
              />
            ) : workspaceMode === 'split' ? (
              <div className="flex flex-col gap-4 lg:flex-row">
                <textarea
                  value={noteContent}
                  onChange={(event) => setNoteContent(event.target.value)}
                  placeholder={t('summary.notePlaceholder')}
                  className="min-h-[260px] w-full flex-1 resize-none rounded-xl border p-4 text-sm outline-none"
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--secondary)',
                    color: 'var(--foreground)'
                  }}
                />
                <div
                  className="min-h-[260px] flex-1 rounded-xl border p-4 overflow-y-auto"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--secondary)' }}
                >
                  {noteContent.trim() ? (
                    <MarkdownPreview
                      content={noteContent}
                      dumpLookup={(dumpId) => dumpMap.get(dumpId)}
                      onDumpClick={setSelectedDump}
                    />
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      {t('summary.noteEmpty')}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="rounded-xl border p-4 overflow-y-auto"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--secondary)' }}
              >
                {noteContent.trim() ? (
                  <MarkdownPreview
                    content={noteContent}
                    dumpLookup={(dumpId) => dumpMap.get(dumpId)}
                    onDumpClick={setSelectedDump}
                  />
                ) : (
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    {t('summary.noteEmpty')}
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div
          className="flex flex-1 items-center justify-center rounded-xl border p-6 text-center"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--secondary)' }}
        >
          <div>
            <FileText className="mx-auto mb-3 h-10 w-10" style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-base font-medium" style={{ color: 'var(--foreground)' }}>
              {t('summary.selectProject')}
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {t('summary.selectProjectHelp')}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
