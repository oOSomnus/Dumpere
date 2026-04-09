import { useEffect, useMemo, useState } from 'react'
import { Project, mockElectronAPI } from '../lib/types'
import { useSummary } from '../hooks/useSummary'
import { useWorkpad } from '../hooks/useWorkpad'
import { formatRelativeTime } from '../lib/utils-time'
import { cn } from '../../lib/utils'
import { FileText, AlertCircle, ArrowLeft, Settings, Download, PencilLine, Eye, Clipboard, Check } from 'lucide-react'
import { MarkdownPreview } from './MarkdownPreview'

const api = typeof window !== 'undefined' && window.electronAPI
  ? window.electronAPI
  : mockElectronAPI

interface SummaryPanelProps {
  projects: Project[]
  activeProjectId: string | null
  onBackToDumps?: () => void
  onOpenSettings?: () => void
}

export function SummaryPanel({ projects, activeProjectId, onBackToDumps, onOpenSettings }: SummaryPanelProps) {
  const [summaryType, setSummaryType] = useState<'daily' | 'weekly'>('daily')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(activeProjectId)
  const [workpadMode, setWorkpadMode] = useState<'edit' | 'preview'>('edit')
  const [copied, setCopied] = useState(false)
  const { currentSummary, summaries, isLoading, error, generateSummary, clearError, setCurrentSummary } = useSummary()
  const {
    content: workpadContent,
    setContent: setWorkpadContent,
    isLoading: isWorkpadLoading,
    isSaving: isWorkpadSaving,
    error: workpadError,
    refresh: refreshWorkpad,
    saveNow: saveWorkpadNow,
    workpad
  } = useWorkpad(selectedProjectId)

  const filteredSummaries = useMemo(() => {
    return summaries.filter(summary => (
      summary.type === summaryType &&
      summary.projectId === selectedProjectId
    ))
  }, [selectedProjectId, summaries, summaryType])

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
      await saveWorkpadNow()
      await generateSummary(summaryType, selectedProjectId)
      await refreshWorkpad()
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

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>
            Summaries
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Keep a project workpad beside your AI summaries.
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
                Project Workpad
              </h2>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {projectName}
              </p>
            </div>

            <div className="inline-flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => setWorkpadMode('edit')}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm"
                style={{
                  backgroundColor: workpadMode === 'edit' ? 'var(--accent)' : 'transparent',
                  color: workpadMode === 'edit' ? 'var(--accent-foreground)' : 'var(--foreground)'
                }}
              >
                <PencilLine className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => setWorkpadMode('preview')}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm"
                style={{
                  backgroundColor: workpadMode === 'preview' ? 'var(--accent)' : 'transparent',
                  color: workpadMode === 'preview' ? 'var(--accent-foreground)' : 'var(--foreground)'
                }}
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            <span>{isWorkpadSaving ? 'Saving...' : 'Saved locally'}</span>
            {workpad?.updatedAt ? <span>Updated {formatRelativeTime(workpad.updatedAt)} ago</span> : null}
          </div>

          {workpadError && (
            <div
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--destructive)',
                color: 'var(--destructive-foreground)'
              }}
            >
              {workpadError}
            </div>
          )}

          {isWorkpadLoading ? (
            <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Loading workpad...
            </div>
          ) : workpadMode === 'edit' ? (
            <textarea
              value={workpadContent}
              onChange={(event) => setWorkpadContent(event.target.value)}
              placeholder="Write your running project notes here. You can also quote dumps into this workpad."
              className="flex-1 w-full resize-none rounded-xl border p-4 text-sm outline-none"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--secondary)',
                color: 'var(--foreground)',
                minHeight: '520px'
              }}
            />
          ) : (
            <div
              className="flex-1 rounded-xl border p-4 overflow-y-auto"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--secondary)' }}
            >
              {workpadContent.trim() ? (
                <MarkdownPreview content={workpadContent} />
              ) : (
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  Nothing in this workpad yet.
                </p>
              )}
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
              onChange={(event) => setSelectedProjectId(event.target.value === 'all' ? null : event.target.value)}
              className="px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--input)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleGenerate}
              disabled={isLoading || isWorkpadLoading}
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
                    Generate a summary to capture the latest dump activity and append it to the current workpad.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
