import { Download, Edit2, Plus, Trash2, Upload } from 'lucide-react'
import type { Project } from '@/shared/types'
import { cn } from '@/shared/cn'
import { useSidebarProjects } from '@/renderer/hooks/useSidebarProjects'
import { PROJECT_NAME_MAX_LENGTH } from '@/renderer/hooks/useProjects'
import { useI18n } from '@/renderer/i18n'

interface SidebarProjectSectionProps {
  projects: Project[]
  activeProjectId: string | null
  onProjectSelect: (projectId: string | null) => void
  projectControls: ReturnType<typeof useSidebarProjects>
  onExportProject?: (projectId: string) => void
  onImportProject?: (projectId: string) => void
}

export function SidebarProjectSection({
  projects,
  activeProjectId,
  onProjectSelect,
  projectControls,
  onExportProject,
  onImportProject
}: SidebarProjectSectionProps) {
  const { t } = useI18n()
  return (
    <>
      <div className="p-3 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--sidebar-foreground)' }}>
            {t('sidebar.projects')}
          </h2>
          <button
            onClick={projectControls.startCreatingProject}
            className="p-1 rounded hover:bg-sidebar-accent transition-colors"
            style={{ color: 'var(--sidebar-foreground)' }}
            aria-label={t('sidebar.createProject')}
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
            {t('sidebar.allProjects')}
          </button>

          {projects.map(project => (
            <div key={project.id}>
              {projectControls.editingProjectId === project.id ? (
                <input
                  ref={projectControls.editInputRef}
                  type="text"
                  value={projectControls.editingName}
                  onChange={event => {
                    projectControls.clearProjectError()
                    projectControls.setEditingName(event.target.value)
                  }}
                  onBlur={() => {
                    void projectControls.handleSaveEdit()
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      void projectControls.handleSaveEdit()
                    }
                    if (event.key === 'Escape') {
                      projectControls.cancelProjectEdit()
                    }
                  }}
                  className="w-full px-3 py-1.5 text-sm rounded-md border"
                  style={{
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                    borderColor: 'var(--border)',
                  }}
                  maxLength={PROJECT_NAME_MAX_LENGTH}
                  disabled={projectControls.isMutating}
                />
              ) : (
                <button
                  onClick={() => onProjectSelect(project.id)}
                  onContextMenu={(event) => projectControls.openContextMenu(event, project.id)}
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
              onChange={event => {
                projectControls.clearProjectError()
                projectControls.setNewProjectName(event.target.value)
              }}
              onBlur={() => {
                if (!projectControls.newProjectName.trim()) {
                  projectControls.cancelProjectCreation()
                } else {
                  void projectControls.handleCreateProject()
                }
              }}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  void projectControls.handleCreateProject()
                }
                if (event.key === 'Escape') {
                  projectControls.cancelProjectCreation()
                }
              }}
              placeholder={t('sidebar.projectNamePlaceholder')}
              className="w-full px-3 py-1.5 text-sm rounded-md border"
              style={{
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                borderColor: 'var(--border)',
              }}
              maxLength={PROJECT_NAME_MAX_LENGTH}
              disabled={projectControls.isMutating}
            />
          )}

          {projects.length === 0 && !projectControls.isCreatingProject && (
            <p className="px-3 py-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {t('sidebar.noProjects')}
            </p>
          )}
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
          onClick={event => event.stopPropagation()}
        >
          <button
            onClick={() => {
              const project = projects.find(entry => entry.id === projectControls.contextMenu?.projectId)
              if (project) {
                projectControls.handleStartEdit(project)
              }
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
            style={{ color: 'var(--foreground)' }}
          >
            <Edit2 className="w-4 h-4" />
            {t('sidebar.edit')}
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
              {t('sidebar.exportProject')}
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
              {t('sidebar.importToProject')}
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
            {t('sidebar.delete')}
          </button>
        </div>
      )}
    </>
  )
}
