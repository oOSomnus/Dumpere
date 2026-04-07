import { useState, useCallback, useEffect } from 'react'
import { Project, mockElectronAPI } from '../lib/types'
import { useSummary } from '../hooks/useSummary'
import { FloatingActionBar } from './FloatingActionBar'
import { formatRelativeTime } from '../lib/utils-time'
import { cn } from '../../lib/utils'
import { FileText, AlertCircle } from 'lucide-react'

const api = typeof window !== 'undefined' && window.electronAPI
  ? window.electronAPI
  : mockElectronAPI

interface SummaryPanelProps {
  projects: Project[]
  activeProjectId: string | null
}

export function SummaryPanel({ projects, activeProjectId }: SummaryPanelProps) {
  const [summaryType, setSummaryType] = useState<'daily' | 'weekly'>('daily')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(activeProjectId)
  const { currentSummary, summaries, isLoading, error, generateSummary, clearError, setCurrentSummary } = useSummary()

  // Auto-select most recent summary when type changes
  useEffect(() => {
    if (summaries.length === 0) return
    const filtered = summaries.filter(s => s.type === summaryType)
    if (filtered.length > 0) {
      const mostRecent = filtered.sort((a, b) => b.generatedAt - a.generatedAt)[0]
      setCurrentSummary(mostRecent)
    } else {
      setCurrentSummary(null)
    }
  }, [summaryType, summaries, setCurrentSummary])

  const handleGenerate = async () => {
    try {
      await generateSummary(summaryType, selectedProjectId)
    } catch {
      // Error is handled by useSummary hook
    }
  }

  const handleExport = async () => {
    if (currentSummary) {
      await api.exportSummary(currentSummary.id)
    }
  }

  // Get project name for display
  const projectName = selectedProjectId
    ? projects.find(p => p.id === selectedProjectId)?.name ?? 'Unknown Project'
    : 'All Projects'

  return (
    <div className="flex flex-col h-full p-6">
      {/* SummaryHeader */}
      <div className="flex flex-col gap-4 mb-6">
        {/* SegmentedControl (Daily | Weekly) */}
        <div className="flex gap-2">
          {(['daily', 'weekly'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSummaryType(type)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors'
              )}
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

        {/* Project filter display */}
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          <span>Project:</span>
          <select
            value={selectedProjectId ?? 'all'}
            onChange={(e) => setSelectedProjectId(e.target.value === 'all' ? null : e.target.value)}
            className="px-2 py-1 rounded border text-sm"
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
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={isLoading}
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
      </div>

      {/* Error state */}
      {error && (
        <div
          className="flex flex-col gap-3 p-4 rounded-lg mb-6"
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
          {error.includes('ollama.ai') && (
            <a
              href="https://ollama.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline"
            >
              Download Ollama
            </a>
          )}
          <button
            onClick={clearError}
            className="text-sm opacity-80 hover:opacity-100 underline text-left"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Content area */}
      {currentSummary ? (
        <div className="flex-1 flex flex-col">
          {/* SummaryMeta */}
          <div className="flex items-center gap-2 mb-4">
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

          {/* MarkdownRenderer */}
          <div
            className="flex-1 overflow-y-auto whitespace-pre-wrap text-base"
            style={{ lineHeight: 1.6 }}
          >
            {currentSummary.content.split('\n').map((line, i) => {
              // Headers
              if (line.startsWith('## ')) {
                return (
                  <h2 key={i} className="text-xl font-semibold mt-4 mb-2" style={{ color: 'var(--foreground)' }}>
                    {line.slice(3)}
                  </h2>
                )
              }
              if (line.startsWith('# ')) {
                return (
                  <h1 key={i} className="text-2xl font-bold mt-4 mb-2" style={{ color: 'var(--foreground)' }}>
                    {line.slice(2)}
                  </h1>
                )
              }
              // Bullet points
              if (line.startsWith('- ')) {
                return (
                  <li key={i} className="ml-4 mb-1" style={{ color: 'var(--foreground)' }}>
                    {line.slice(2)}
                  </li>
                )
              }
              // Empty lines
              if (!line.trim()) {
                return <br key={i} />
              }
              // Regular text
              return (
                <p key={i} className="mb-2" style={{ color: 'var(--foreground)' }}>
                  {line}
                </p>
              )
            })}
          </div>

          {/* Export FAB */}
          <div className="mt-4">
            <FloatingActionBar
              selectionCount={1}
              onExport={handleExport}
              onDismiss={() => {}}
            />
          </div>
        </div>
      ) : (
        /* Empty state */
        !error && !isLoading && !currentSummary && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <FileText className="w-12 h-12 mb-4" style={{ color: 'var(--muted-foreground)' }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              {summaries.length > 0 ? 'Select a summary' : 'No dumps yet'}
            </h3>
            <p className="text-sm max-w-md" style={{ color: 'var(--muted-foreground)' }}>
              {summaries.length > 0
                ? 'Use the dropdown above to view previously generated summaries.'
                : 'Add dumps throughout the day to see your AI-generated summary here.'}
            </p>
          </div>
        )
      )}
    </div>
  )
}
