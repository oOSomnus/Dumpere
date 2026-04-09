import { useEffect, useMemo, useState } from 'react'
import { Project, DumpEntry, Tag, mockElectronAPI } from '../lib/types'
import { useSummary } from '../hooks/useSummary'
import { useWorkspaceTree } from '../hooks/useWorkspaceTree'
import { useWorkspaceNote } from '../hooks/useWorkspaceNote'
import { formatRelativeTime } from '../lib/utils-time'
import { cn } from '../../lib/utils'
import {
  FileText,
  AlertCircle,
  ArrowLeft,
  Settings,
  Download,
  PencilLine,
  Eye,
  Clipboard,
  Check,
  Columns2
} from 'lucide-react'
import { MarkdownPreview } from './MarkdownPreview'
import { WorkspaceTree } from './WorkspaceTree'
import { ExpandedCard } from './ExpandedCard'

const api = typeof window !== 'undefined' && window.electronAPI
  ? window.electronAPI
  : mockElectronAPI

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

type WorkspaceMode = 'edit' | 'split' | 'preview'

function buildAutoName(existingPaths: string[], parentPath: string, type: 'folder' | 'note'): string {
  const baseName = type === 'folder' ? 'New Folder' : 'New Note'
  const extension = type === 'note' ? '.md' : ''
  const normalizedParent = parentPath ? `${parentPath}/` : ''

  let index = 1
  while (true) {
    const suffix = index === 1 ? '' : ` ${index}`
    const candidate = `${baseName}${suffix}${extension}`
    if (!existingPaths.includes(`${normalizedParent}${candidate}`)) {
      return candidate
    }
    index += 1
  }
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
  const [summaryType, setSummaryType] = useState<'daily' | 'weekly'>('daily')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(activeProjectId)
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('edit')
  const [copied, setCopied] = useState(false)
  const [selectedDump, setSelectedDump] = useState<DumpEntry | null>(null)
  const { currentSummary, summaries, isLoading, error, generateSummary, clearError, setCurrentSummary } = useSummary()
  const {
    tree,
    isLoading: isWorkspaceLoading,
    error: workspaceError,
    refresh: refreshWorkspace,
    createFolder,
    createNote,
    renameEntry,
    deleteEntry,
    notePaths
  } = useWorkspaceTree(selectedProjectId)

  const activeNotePath = selectedProjectId ? activeNotePaths[selectedProjectId] ?? null : null
  const effectiveNotePath = selectedProjectId && activeNotePath && notePaths.includes(activeNotePath)
    ? activeNotePath
    : null

  const {
    content: noteContent,
    setContent: setNoteContent,
    isLoading: isNoteLoading,
    isSaving: isNoteSaving,
    error: noteError,
    refresh: refreshNote,
    saveNow: saveNoteNow,
    note
  } = useWorkspaceNote(selectedProjectId, effectiveNotePath)

  useEffect(() => {
    setSelectedProjectId(activeProjectId)
  }, [activeProjectId])

  useEffect(() => {
    if (!selectedProjectId) {
      return
    }

    if (activeNotePath && !notePaths.includes(activeNotePath)) {
      const nextPath = notePaths[0] ?? ''
      onActiveNotePathChange(selectedProjectId, nextPath)
    }
  }, [activeNotePath, notePaths, onActiveNotePathChange, selectedProjectId])

  const filteredSummaries = useMemo(() => {
    return summaries.filter(summary => (
      summary.type === summaryType &&
      summary.projectId === selectedProjectId
    ))
  }, [selectedProjectId, summaries, summaryType])

  const dumpMap = useMemo(() => new Map(dumps.map(dump => [dump.id, dump])), [dumps])

  useEffect(() => {
    if (filteredSummaries.length === 0) {
      setCurrentSummary(null)
      return
    }

    const stillVisible = currentSummary && filteredSummaries.some(summary => summary.id === currentSummary.id)
    if (!stillVisible) {
      setCurrentSummary(filteredSummaries[0] ?? null)
    }
  }, [currentSummary, filteredSummaries, setCurrentSummary])

  const handleGenerate = async () => {
    try {
      await saveNoteNow()
      await generateSummary(summaryType, selectedProjectId)
      await refreshWorkspace()
      await refreshNote()
    } catch {
      // Error is handled by the hooks.
    }
  }

  const handleExport = async () => {
    if (currentSummary) {
      await api.exportSummary(currentSummary.id)
    }
  }

  const handleCopySummary = async () => {
    if (currentSummary?.content) {
      await navigator.clipboard.writeText(currentSummary.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const projectName = selectedProjectId
    ? projects.find(project => project.id === selectedProjectId)?.name ?? 'Unknown Project'
    : 'All Projects'

  const handleCreateFolder = async (parentPath: string) => {
    const name = buildAutoName(notePaths.concat(tree.map(node => node.path)), parentPath, 'folder')
    await createFolder(parentPath, name)
  }

  const handleCreateNote = async (parentPath: string) => {
    const name = buildAutoName(notePaths, parentPath, 'note')
    const nextNote = await createNote(parentPath, name)
    if (selectedProjectId && nextNote) {
      onActiveNotePathChange(selectedProjectId, nextNote.path)
    }
  }

  const handleRenameEntryWithName = async (path: string, name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) return
    const result = await renameEntry(path, trimmedName)
    if (selectedProjectId && result && effectiveNotePath === path) {
      onActiveNotePathChange(selectedProjectId, result.path)
    }
  }

  const handleDeleteEntry = async (path: string) => {
    if (!window.confirm(`Delete ${path}? This cannot be undone.`)) {
      return
    }

    await deleteEntry(path)
    if (selectedProjectId && effectiveNotePath === path) {
      onActiveNotePathChange(selectedProjectId, '')
    }
  }

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>
            Summaries
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Browse a project workspace beside your AI summaries.
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
            Back to Dumps
          </button>
        )}
      </div>

      <div className="flex flex-col gap-6 flex-1 min-h-0">
        <section
          className="rounded-2xl border p-5 flex flex-col gap-4 min-h-0 flex-1"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                Project Workspace
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
                  Edit
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
                  Split
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
                  Preview
                </button>
              </div>
            )}
          </div>

          {selectedProjectId ? (
            <>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                <span>{isNoteSaving ? 'Saving...' : 'Saved locally'}</span>
                {note?.updatedAt ? <span>Updated {formatRelativeTime(note.updatedAt)} ago</span> : null}
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
                      Loading workspace...
                    </div>
                  ) : (
                    <WorkspaceTree
                      tree={tree}
                      selectedPath={effectiveNotePath}
                      onSelect={(path) => selectedProjectId && onActiveNotePathChange(selectedProjectId, path)}
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
                      Loading note...
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
                        No notes yet
                      </p>
                      <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                        Create a note from the workspace toolbar to start writing.
                      </p>
                    </div>
                  </div>
                ) : workspaceMode === 'edit' ? (
                  <textarea
                    value={noteContent}
                    onChange={(event) => setNoteContent(event.target.value)}
                    placeholder="Write project notes here. Insert dump references to keep source material linked."
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
                      placeholder="Write project notes here. Insert dump references to keep source material linked."
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
                          Nothing in this note yet.
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
                        Nothing in this note yet.
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
                  Select a project to open its workspace
                </p>
                <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  All Projects can still generate summaries, but workspace notes are project-specific.
                </p>
              </div>
            </div>
          )}
        </section>

        <section
          className="rounded-2xl border p-5 flex flex-col gap-5 min-h-0 flex-1"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {(['daily', 'weekly'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSummaryType(type)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: summaryType === type ? 'var(--accent)' : 'transparent',
                    color: summaryType === type ? 'var(--accent-foreground)' : 'var(--foreground)',
                    border: '1px solid var(--border)'
                  }}
                >
                  {type === 'daily' ? 'Daily' : 'Weekly'}
                </button>
              ))}
            </div>

            <select
              value={selectedProjectId ?? 'all'}
              onChange={(event) => {
                const nextProjectId = event.target.value === 'all' ? null : event.target.value
                setSelectedProjectId(nextProjectId)
                if (nextProjectId) {
                  onActiveNotePathChange(nextProjectId, '')
                }
              }}
              className="px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--input)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            >
              <option value="all" style={{ color: 'var(--foreground)', backgroundColor: 'var(--popover)' }}>All Projects</option>
              {projects.map(project => (
                <option
                  key={project.id}
                  value={project.id}
                  style={{ color: 'var(--foreground)', backgroundColor: 'var(--popover)' }}
                >
                  {project.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleGenerate}
              disabled={isLoading || isNoteLoading}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)'
              }}
            >
              {isLoading ? 'Generating summary...' : 'Generate Summary'}
            </button>

            {currentSummary && (
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--secondary)',
                  color: 'var(--secondary-foreground)'
                }}
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            )}
            {currentSummary && (
              <button
                onClick={handleCopySummary}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                style={{
                  backgroundColor: copied ? 'var(--accent)' : 'var(--secondary)',
                  color: copied ? 'var(--accent-foreground)' : 'var(--foreground)',
                  border: '1px solid var(--border)'
                }}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Clipboard className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            )}
          </div>

          {error && (
            <div
              className="flex flex-col gap-3 p-4 rounded-lg"
              style={{
                backgroundColor: 'var(--destructive)',
                color: 'var(--destructive-foreground)'
              }}
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">AI Summary Unavailable</p>
                  <p className="text-sm opacity-90">{error}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="inline-flex items-center gap-2 text-sm underline"
                  >
                    <Settings className="w-4 h-4" />
                    Open Settings
                  </button>
                )}
                <button
                  onClick={clearError}
                  className="text-sm opacity-80 hover:opacity-100 underline text-left"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] flex-1 min-h-0">
            <div
              className="rounded-xl border overflow-y-auto"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--secondary)', maxHeight: '540px' }}
            >
              {filteredSummaries.length > 0 ? (
                filteredSummaries.map(summary => (
                  <button
                    key={summary.id}
                    onClick={() => setCurrentSummary(summary)}
                    className="w-full text-left px-4 py-3 border-b transition-colors hover:bg-accent"
                    style={{
                      borderColor: 'var(--border)',
                      backgroundColor: currentSummary?.id === summary.id ? 'var(--accent)' : 'transparent',
                      color: currentSummary?.id === summary.id ? 'var(--accent-foreground)' : 'var(--foreground)'
                    }}
                  >
                    <p className="text-sm font-medium">
                      {summary.type === 'daily' ? 'Daily' : 'Weekly'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {formatRelativeTime(summary.generatedAt)} ago
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                      {summary.dumpCount} dumps
                    </p>
                  </button>
                ))
              ) : (
                <div className="p-4 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  No saved summaries for this view yet.
                </div>
              )}
            </div>

            <div
              className="rounded-xl border p-4 overflow-y-auto min-h-0"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--secondary)' }}
            >
              {currentSummary ? (
                <>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
                    >
                      {currentSummary.type === 'daily' ? 'Daily' : 'Weekly'}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      {projectName}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      Generated {formatRelativeTime(currentSummary.generatedAt)} ago
                    </span>
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      ({currentSummary.dumpCount} dumps)
                    </span>
                  </div>
                  <MarkdownPreview content={currentSummary.content} />
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <FileText className="w-12 h-12 mb-4" style={{ color: 'var(--muted-foreground)' }} />
                  <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                    {filteredSummaries.length > 0 ? 'Select a summary' : 'No summaries yet'}
                  </h3>
                  <p className="text-sm max-w-md" style={{ color: 'var(--muted-foreground)' }}>
                    Generate a summary to capture the latest dump activity and append it to the project workspace.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
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
