import * as Popover from '@radix-ui/react-popover'
import type { Project } from '@/shared/types'
import { cn } from '@/shared/cn'
import { FolderOpen, Check } from 'lucide-react'

interface ProjectSelectorProps {
  projects: Project[]
  activeProjectId: string | null
  onSelect: (projectId: string | null) => void
  allowAllProjects?: boolean
  emptyLabel?: string
  hasError?: boolean
}

export function ProjectSelector({
  projects,
  activeProjectId,
  onSelect,
  allowAllProjects = true,
  emptyLabel = 'All Projects',
  hasError = false
}: ProjectSelectorProps) {
  const activeProject = projects.find(p => p.id === activeProjectId)
  const displayName = activeProject?.name || emptyLabel

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border',
            'transition-colors duration-150',
            'hover:bg-accent'
          )}
          style={{
            backgroundColor: 'transparent',
            color: 'var(--foreground)',
            borderColor: hasError ? 'var(--destructive)' : 'transparent'
          }}
        >
          <FolderOpen className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
          <span className="max-w-[120px] truncate">{displayName}</span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className={cn(
            'w-48 rounded-md p-1 shadow-lg',
            'animate-in fade-in duration-150'
          )}
          style={{
            backgroundColor: 'var(--popover)',
            borderColor: 'var(--border)',
            border: '1px solid var(--border)',
          }}
          sideOffset={4}
        >
          <div className="flex flex-col gap-0.5">
            {allowAllProjects && (
              <button
                onClick={() => onSelect(null)}
                className={cn(
                  'flex items-center justify-between w-full text-left px-3 py-2 rounded-sm text-sm',
                  'transition-colors duration-150',
                  'hover:bg-accent'
                )}
                style={{
                  backgroundColor: activeProjectId === null ? 'var(--accent)' : 'transparent',
                  color: 'var(--foreground)',
                }}
              >
                <span>All Projects</span>
                {activeProjectId === null && <Check className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />}
              </button>
            )}

            {/* Individual projects */}
            {projects.map(project => (
              <button
                key={project.id}
                onClick={() => onSelect(project.id)}
                className={cn(
                  'flex items-center justify-between w-full text-left px-3 py-2 rounded-sm text-sm',
                  'transition-colors duration-150',
                  'hover:bg-accent'
                )}
                style={{
                  backgroundColor: activeProjectId === project.id ? 'var(--accent)' : 'transparent',
                  color: 'var(--foreground)',
                }}
              >
                <span className="truncate max-w-[140px]">{project.name}</span>
                {activeProjectId === project.id && (
                  <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--muted-foreground)' }} />
                )}
              </button>
            ))}

            {/* Empty state */}
            {projects.length === 0 && (
              <p
                className="px-3 py-2 text-sm"
                style={{ color: 'var(--muted-foreground)' }}
              >
                No projects yet
              </p>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
