import type { DateFilterState, DatePreset, Project, Tag } from '@/shared/types'
import type { AppView } from '../hooks/useAppController'
import { useSidebarProjects } from '../hooks/useSidebarProjects'
import { usePrompt } from '../hooks/usePrompt'
import { useI18n } from '../i18n'
import { SidebarDateSection } from './sidebar/SidebarDateSection'
import { SidebarProjectSection } from './sidebar/SidebarProjectSection'
import { SidebarSearch } from './sidebar/SidebarSearch'
import { SidebarTagsSection } from './sidebar/SidebarTagsSection'
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
  const { t } = useI18n()
  const projectControls = useSidebarProjects({
    projects,
    onCreateProject,
    onUpdateProject,
    onDeleteProject
  })

  const handleDeleteTag = async (tag: Tag) => {
    const confirmed = await prompt.confirm({
      title: t('tags.deleteTitle', { name: tag.name }),
      description: t('tags.deleteDescription'),
      confirmLabel: t('tags.deleteConfirm'),
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
      <SidebarSearch
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onSearchFocusChange={onSearchFocusChange}
        onViewChange={onViewChange}
      />

      <SidebarProjectSection
        projects={projects}
        activeProjectId={activeProjectId}
        onProjectSelect={onProjectSelect}
        projectControls={projectControls}
        onExportProject={onExportProject}
        onImportProject={onImportProject}
      />

      <SidebarTagsSection
        tags={tags}
        selectedTagIds={selectedTagIds}
        onTagToggle={onTagToggle}
        onDeleteTag={handleDeleteTag}
      />

      <SidebarDateSection
        dateFilter={dateFilter}
        onDatePresetChange={onDatePresetChange}
        onToggleDate={onToggleDate}
        onSetDateKeys={onSetDateKeys}
        onClearDateFilter={onClearDateFilter}
      />

      <div className="p-3 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
        <SidebarViewNavigation currentView={currentView} onViewChange={onViewChange} />
      </div>
    </aside>
  )
}
