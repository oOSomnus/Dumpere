import { AlertCircle, Check, Clipboard, Download, FileText, Settings } from 'lucide-react'
import type { SummaryEntry } from '@/shared/types'
import { formatRelativeTime } from '@/renderer/lib/utils-time'
import { cn } from '@/shared/cn'
import { MarkdownPreview } from '@/renderer/components/MarkdownPreview'

interface SummaryHistorySectionProps {
  summaryType: 'daily' | 'weekly'
  setSummaryType: (type: 'daily' | 'weekly') => void
  handleGenerate: () => Promise<void>
  isLoading: boolean
  isNoteLoading: boolean
  currentSummary: SummaryEntry | null
  handleExport: () => Promise<void>
  handleCopySummary: () => Promise<void>
  copied: boolean
  error: string | null
  clearError: () => void
  onOpenSettings?: () => void
  filteredSummaries: SummaryEntry[]
  setCurrentSummary: (summary: SummaryEntry | null) => void
  projectName: string
}

export function SummaryHistorySection({
  summaryType,
  setSummaryType,
  handleGenerate,
  isLoading,
  isNoteLoading,
  currentSummary,
  handleExport,
  handleCopySummary,
  copied,
  error,
  clearError,
  onOpenSettings,
  filteredSummaries,
  setCurrentSummary,
  projectName
}: SummaryHistorySectionProps) {
  return (
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

        <button
          onClick={() => void handleGenerate()}
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
            onClick={() => void handleExport()}
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
            onClick={() => void handleCopySummary()}
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
  )
}
