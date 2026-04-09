import { useState, useRef } from 'react'
import * as Checkbox from '@radix-ui/react-checkbox'
import { DateFilterState, DatePreset, Project, Tag } from '../lib/types'
import { cn } from '../../lib/utils'
import { Plus, Check, Trash2, Edit2, Download, Upload, FileText, LayoutGrid, Settings } from 'lucide-react'
import { DateFilterPopover } from './DateFilterPopover'

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
  onCreateProject: (name: string) => void
  onUpdateProject: (id: string, name: string) => void
  onDeleteProject: (id: string) => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
  onSearchFocusChange?: (focused: boolean) => void
  onExportProject?: (projectId: string) => void
  onImportProject?: (projectId: string) => void
  currentView?: 'grid' | 'summaries' | 'settings'
  onViewChange?: (view: 'grid' | 'summaries' | 'settings') => void
}

interface ContextMenuState {
  projectId: string
  x: number
  y: number
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
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const newProjectInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const presetOptions: Array<{ value: DatePreset | null; label: string }> = [
    { value: null, label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ]

  // Handle creating a new project
  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      onCreateProject(newProjectName.trim())
      setNewProjectName('')
      setIsCreatingProject(false)
    }
  }

  // Handle starting to edit a project
  const handleStartEdit = (project: Project) => {
    setEditingProjectId(project.id)
    setEditingName(project.name)
    setContextMenu(null)
  }

  // Handle saving edited project
  const handleSaveEdit = () => {
    if (editingProjectId && editingName.trim()) {
      onUpdateProject(editingProjectId, editingName.trim())
    }
    setEditingProjectId(null)
    setEditingName('')
  }

  // Handle delete project with confirmation
  const handleDeleteProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project && window.confirm(`Delete project '${project.name}'? Dumps will be moved to Unassigned. This cannot be undone.`)) {
      onDeleteProject(projectId)
    }
    setContextMenu(null)
  }

  // Close context menu on click outside
  const handleContextMenu = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault()
    setContextMenu({ projectId, x: e.clientX, y: e.clientY })
  }

  // Close context menu on click
  const closeContextMenu = () => setContextMenu(null)

  const handleDeleteTag = async (tag: Tag) => {
    const confirmed = window.confirm(
      `Delete tag '${tag.name}'? It will be removed from all dumps and filters.`
    )

    if (!confirmed) return
    await onDeleteTag(tag.id)
  }

  return (
    <aside
      className="flex flex-col h-full"
      style={{
        width: '240px',
        backgroundColor: 'var(--sidebar)',
        borderRight: '1px solid var(--sidebar-border)',
        overflowY: 'auto',
      }}
      onClick={closeContextMenu}
    >
      {/* Search Section */}
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

      {/* Projects Section */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--sidebar-foreground)' }}>
            Projects
          </h2>
          <button
            onClick={() => {
              setIsCreatingProject(true)
              setTimeout(() => newProjectInputRef.current?.focus(), 0)
            }}
            className="p-1 rounded hover:bg-sidebar-accent transition-colors"
            style={{ color: 'var(--sidebar-foreground)' }}
            aria-label="Create project"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Project List */}
        <div className="space-y-0.5">
          {/* All Projects option */}
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

          {/* Individual projects */}
          {projects.map(project => (
            <div key={project.id}>
              {editingProjectId === project.id ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveEdit()
                    if (e.key === 'Escape') {
                      setEditingProjectId(null)
                      setEditingName('')
                    }
                  }}
                  className="w-full px-3 py-1.5 text-sm rounded-md border"
                  style={{
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                    borderColor: 'var(--border)',
                  }}
                  maxLength={50}
                />
              ) : (
                <button
                  onClick={() => onProjectSelect(project.id)}
                  onContextMenu={(e) => handleContextMenu(e, project.id)}
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

          {/* New project input */}
          {isCreatingProject && (
            <input
              ref={newProjectInputRef}
              type="text"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onBlur={() => {
                if (!newProjectName.trim()) {
                  setIsCreatingProject(false)
                } else {
                  handleCreateProject()
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateProject()
                if (e.key === 'Escape') {
                  setIsCreatingProject(false)
                  setNewProjectName('')
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
            />
          )}

          {/* Empty state */}
          {projects.length === 0 && !isCreatingProject && (
            <p className="px-3 py-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              No projects yet
            </p>
          )}
        </div>
      </div>

      {/* Tags Section */}
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

          {/* Empty state */}
          {tags.length === 0 && (
            <p className="px-3 py-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Tags will appear here as you add them to dumps.
            </p>
          )}
        </div>
      </div>

      {/* Date Filter Section */}
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

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 rounded-md shadow-lg py-1 min-w-[120px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: 'var(--popover)',
            border: '1px solid var(--border)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const project = projects.find(p => p.id === contextMenu.projectId)
              if (project) handleStartEdit(project)
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
                if (contextMenu) {
                  onExportProject(contextMenu.projectId)
                }
                closeContextMenu()
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
                if (contextMenu) {
                  onImportProject(contextMenu.projectId)
                }
                closeContextMenu()
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
              style={{ color: 'var(--foreground)' }}
            >
              <Upload className="w-4 h-4" />
              Import to Project
            </button>
          )}
          <button
            onClick={() => handleDeleteProject(contextMenu.projectId)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
            style={{ color: 'var(--destructive)' }}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      {/* Phase 4: Summaries Button */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div className="space-y-1">
          <button
            onClick={() => onViewChange?.('grid')}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
              'hover:bg-sidebar-accent'
            )}
            style={{
              backgroundColor: currentView === 'grid' ? 'var(--sidebar-accent)' : 'transparent',
              color: 'var(--sidebar-foreground)'
            }}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Dumps</span>
          </button>

          <button
            onClick={() => onViewChange?.('summaries')}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
              'hover:bg-sidebar-accent'
            )}
            style={{
              backgroundColor: currentView === 'summaries' ? 'var(--sidebar-accent)' : 'transparent',
              color: 'var(--sidebar-foreground)'
            }}
          >
            <FileText className="w-4 h-4" />
            <span>Summaries</span>
          </button>

          <button
            onClick={() => onViewChange?.('settings')}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
              'hover:bg-sidebar-accent'
            )}
            style={{
              backgroundColor: currentView === 'settings' ? 'var(--sidebar-accent)' : 'transparent',
              color: 'var(--sidebar-foreground)'
            }}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
