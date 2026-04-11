import * as Checkbox from '@radix-ui/react-checkbox'
import { Plus, Check, Trash2, Edit2, Download, Upload } from 'lucide-react'
import { DateFilterState, DatePreset, Project, Tag } from '../lib/types'
import type { AppView } from '../hooks/useAppController'
import { useSidebarProjects } from '../hooks/useSidebarProjects'
import { usePrompt } from '../hooks/usePrompt'
import { cn } from '../../lib/utils'
import { DateFilterPopover } from './DateFilterPopover'
import { SidebarViewNavigation } from './sidebar/SidebarViewNavigation'

interface SidebarProps {
  projects: Project[]
  tags: Tag[]
  activeProjectId: string | null
  selectedTagIds: string[]
  dateFilter: DateFilterState
  onProjectSelect: (projectId: string | null) => void
  onTagToggle: (tagId: string) => void
  onDeleteTag: (tagId: string) => Promise<void> | void
  onDatePresetChange: (preset: DatePreset | null) => void
  onToggleDate: (dateKey: string) => void
  onSetDateKeys: (dateKeys: string[]) => void
  onClearDateFilter: () => void
  onCreateProject: (name: string) => Promise<void> | void
  onUpdateProject: (id: string, name: string) => Promise<void> | void
  onDeleteProject: (id: string) => Promise<void> | void
  searchQuery?: string
  onSearchChange?: (query: string) => void
  onSearchFocusChange?: (focused: boolean) => void
  onExportProject?: (projectId: string) => void
  onImportProject?: (projectId: string) => void
  currentView?: AppView
  onViewChange?: (view: AppView) => void
}

export function Sidebar({
  projects,
  tags,
  activeProjectId,
  selectedTagIds,
  dateFilter,
  onProjectSelect,
  onTagToggle,
  onDeleteTag,
  onDatePresetChange,
  onToggleDate,
  onSetDateKeys,
  onClearDateFilter,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  searchQuery = '',
  onSearchChange,
  onSearchFocusChange,
  onExportProject,
  onImportProject,
  currentView = 'grid',
  onViewChange,
}: SidebarProps) {
  const prompt = usePrompt()
  const presetOptions: Array<{ value: DatePreset | null; label: string }> = [
    { value: null, label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ]

  const projectControls = useSidebarProjects({
    projects,
    onCreateProject,
    onUpdateProject,
    onDeleteProject
  })

  const handleDeleteTag = async (tag: Tag) => {
    const confirmed = await prompt.confirm({
      title: `Delete tag '${tag.name}'?`,
      description: 'It will be removed from all dumps and filters.',
      confirmLabel: 'Delete Tag',
      destructive: true
    })

    if (!confirmed) return
    await onDeleteTag(tag.id)
  }

  return (
    <aside
      className="flex flex-col h-full"
      style={{
        width: '100%',
        backgroundColor: 'var(--sidebar)',
        borderRight: '1px solid var(--sidebar-border)',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
      onClick={projectControls.closeContextMenu}
    >
      {onSearchChange && (
        <div className="p-3 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
          <input
            type="text"
            value={searchQuery}
            onFocus={() => onSearchFocusChange?.(true)}
            onBlur={() => onSearchFocusChange?.(false)}
            onChange={(e) => {
              onViewChange?.('grid')
              onSearchChange(e.target.value)
            }}
            placeholder="Search dumps..."
            className="w-full px-3 py-2 rounded-md text-sm"
            style={{
              backgroundColor: 'var(--input)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
          />
        </div>
      )}

      <div className="p-3 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--sidebar-foreground)' }}>
            Projects
          </h2>
          <button
            onClick={projectControls.startCreatingProject}
            className="p-1 rounded hover:bg-sidebar-accent transition-colors"
            style={{ color: 'var(--sidebar-foreground)' }}
            aria-label="Create project"
            disabled={projectControls.isMutating}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {projectControls.projectError && (
          <div
            className="mb-2 rounded-md px-3 py-2 text-sm"
            style={{
              backgroundColor: 'var(--destructive)',
              color: 'var(--destructive-foreground)'
            }}
          >
            {projectControls.projectError}
          </div>
        )}

        <div className="space-y-0.5">
          <button
            onClick={() => onProjectSelect(null)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
              'hover:bg-sidebar-accent'
            )}
            style={{
              backgroundColor: activeProjectId === null ? 'var(--sidebar-accent)' : 'transparent',
              color: 'var(--sidebar-foreground)',
            }}
          >
            All Projects
          </button>

          {projects.map(project => (
            <div key={project.id}>
              {projectControls.editingProjectId === project.id ? (
                <input
                  ref={projectControls.editInputRef}
                  type="text"
                  value={projectControls.editingName}
                  onChange={e => {
                    projectControls.clearProjectError()
                    projectControls.setEditingName(e.target.value)
                  }}
                  onBlur={() => {
                    void projectControls.handleSaveEdit()
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      void projectControls.handleSaveEdit()
                    }
                    if (e.key === 'Escape') {
                      projectControls.cancelProjectEdit()
                    }
                  }}
                  className="w-full px-3 py-1.5 text-sm rounded-md border"
                  style={{
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                    borderColor: 'var(--border)',
                  }}
                  maxLength={50}
                  disabled={projectControls.isMutating}
                />
              ) : (
                <button
                  onClick={() => onProjectSelect(project.id)}
                  onContextMenu={(e) => projectControls.openContextMenu(e, project.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-sm transition-colors truncate',
                    'hover:bg-sidebar-accent'
                  )}
                  style={{
                    backgroundColor: activeProjectId === project.id ? 'var(--sidebar-accent)' : 'transparent',
                    color: 'var(--sidebar-foreground)',
                  }}
                  title={project.name}
                >
                  <span className="truncate block max-w-[180px]">{project.name}</span>
                </button>
              )}
            </div>
          ))}

          {projectControls.isCreatingProject && (
            <input
              ref={projectControls.newProjectInputRef}
              type="text"
              value={projectControls.newProjectName}
              onChange={e => {
                projectControls.clearProjectError()
                projectControls.setNewProjectName(e.target.value)
              }}
              onBlur={() => {
                if (!projectControls.newProjectName.trim()) {
                  projectControls.cancelProjectCreation()
                } else {
                  void projectControls.handleCreateProject()
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  void projectControls.handleCreateProject()
                }
                if (e.key === 'Escape') {
                  projectControls.cancelProjectCreation()
                }
              }}
              placeholder="Project name..."
              className="w-full px-3 py-1.5 text-sm rounded-md border"
              style={{
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                borderColor: 'var(--border)',
              }}
              maxLength={50}
              disabled={projectControls.isMutating}
            />
          )}

          {projects.length === 0 && !projectControls.isCreatingProject && (
            <p className="px-3 py-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              No projects yet
            </p>
          )}
        </div>
      </div>

      <div className="p-3 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
        <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--sidebar-foreground)' }}>
          Tags
        </h2>

        <div className="space-y-1">
          {tags.map(tag => (
            <div
              key={tag.id}
              className="group flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent transition-colors"
            >
              <label className="flex min-w-0 flex-1 items-center gap-2 cursor-pointer">
                <Checkbox.Root
                  checked={selectedTagIds.includes(tag.id)}
                  onCheckedChange={() => onTagToggle(tag.id)}
                  aria-label={`Toggle tag filter ${tag.name}`}
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center',
                    'transition-colors duration-150'
                  )}
                  style={{
                    backgroundColor: selectedTagIds.includes(tag.id) ? 'var(--accent)' : 'transparent',
                    borderColor: selectedTagIds.includes(tag.id) ? 'var(--accent)' : 'var(--border)',
                  }}
                >
                  <Checkbox.Indicator>
                    <Check className="w-3 h-3" style={{ color: 'var(--accent-foreground)' }} />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <span
                  className="truncate flex-1"
                  style={{ color: 'var(--sidebar-foreground)' }}
                  title={tag.name}
                >
                  {tag.name}
                </span>
              </label>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  void handleDeleteTag(tag)
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100"
                style={{ color: 'var(--muted-foreground)' }}
                aria-label={`Delete tag ${tag.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {tags.length === 0 && (
            <p className="px-3 py-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Tags will appear here as you add them to dumps.
            </p>
          )}
        </div>
      </div>

      <div className="p-3">
        <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--sidebar-foreground)' }}>
          Dates
        </h2>
        <div className="flex flex-col gap-1">
          {presetOptions.map((preset) => (
            <button
              key={preset.label}
              onClick={() => onDatePresetChange(preset.value)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-md text-sm transition-colors duration-150',
                'hover:bg-sidebar-accent'
              )}
              style={{
                backgroundColor:
                  (preset.value === null && dateFilter.mode === 'all') ||
                  (preset.value !== null && dateFilter.mode === 'preset' && dateFilter.preset === preset.value)
                    ? 'var(--sidebar-accent)'
                    : 'transparent',
                color: 'var(--sidebar-foreground)',
              }}
            >
              {preset.label}
            </button>
          ))}

          <DateFilterPopover
            selectedDates={dateFilter.mode === 'dates' ? dateFilter.dates : []}
            onToggleDate={onToggleDate}
            onSetDateKeys={onSetDateKeys}
            onClear={onClearDateFilter}
          />
        </div>
      </div>

      {projectControls.contextMenu && (
        <div
          className="fixed z-50 rounded-md shadow-lg py-1 min-w-[120px]"
          style={{
            left: projectControls.contextMenu.x,
            top: projectControls.contextMenu.y,
            backgroundColor: 'var(--popover)',
            border: '1px solid var(--border)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const project = projects.find(p => p.id === projectControls.contextMenu?.projectId)
              if (project) projectControls.handleStartEdit(project)
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
            style={{ color: 'var(--foreground)' }}
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          {onExportProject && (
            <button
              onClick={() => {
                if (projectControls.contextMenu) {
                  onExportProject(projectControls.contextMenu.projectId)
                }
                projectControls.closeContextMenu()
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
              style={{ color: 'var(--foreground)' }}
            >
              <Download className="w-4 h-4" />
              Export Project
            </button>
          )}
          {onImportProject && (
            <button
              onClick={() => {
                if (projectControls.contextMenu) {
                  onImportProject(projectControls.contextMenu.projectId)
                }
                projectControls.closeContextMenu()
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
              style={{ color: 'var(--foreground)' }}
            >
              <Upload className="w-4 h-4" />
              Import to Project
            </button>
          )}
          <button
            onClick={() => {
              if (projectControls.contextMenu) {
                void projectControls.handleDeleteProject(projectControls.contextMenu.projectId)
              }
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
            style={{ color: 'var(--destructive)' }}
            disabled={projectControls.isMutating}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      <div className="p-3 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
        <SidebarViewNavigation currentView={currentView} onViewChange={onViewChange} />
      </div>
    </aside>
  )
}
