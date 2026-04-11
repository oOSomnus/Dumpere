import type { Project } from '@/shared/types'

interface SummaryProjectToolbarProps {
  projects: Project[]
  selectedProjectId: string | null
  onProjectSelectionChange: (projectId: string | null) => void
}

export function SummaryProjectToolbar({
  projects,
  selectedProjectId,
  onProjectSelectionChange
}: SummaryProjectToolbarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
    >
      <label
        htmlFor="summaries-project-select"
        className="text-sm font-medium"
        style={{ color: 'var(--foreground)' }}
      >
        Project
      </label>
      <select
        id="summaries-project-select"
        value={selectedProjectId ?? 'all'}
        onChange={(event) => {
          onProjectSelectionChange(event.target.value === 'all' ? null : event.target.value)
        }}
        className="min-w-[180px] px-3 py-2 rounded-lg border text-sm"
        style={{
          backgroundColor: 'var(--input)',
          borderColor: 'var(--border)',
          color: 'var(--foreground)'
        }}
      >
        <option value="all" style={{ color: 'var(--foreground)', backgroundColor: 'var(--popover)' }}>
          All Projects
        </option>
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
      <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
        Choose which project workspace and summary history you want to browse.
      </p>
    </div>
  )
}
