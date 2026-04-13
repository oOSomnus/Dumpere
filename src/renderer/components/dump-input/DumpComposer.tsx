import type { ChangeEvent, ClipboardEvent, DragEvent, KeyboardEvent, RefObject } from 'react'
import type { Project } from '@/shared/types'
import { cn } from '@/shared/cn'
import { ProjectSelector } from '@/renderer/components/ProjectSelector'
import { useI18n } from '@/renderer/i18n'

interface DumpComposerProps {
  inputRef: RefObject<HTMLTextAreaElement>
  text: string
  onTextChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => Promise<void>
  onDrop: (event: DragEvent<HTMLTextAreaElement>) => void
  onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => Promise<void>
  isSubmitting: boolean
  inputHeight: number
  projects: Project[]
  activeProjectId: string | null
  onProjectSelect: (projectId: string | null) => void
  projectError: string | null
}

export function DumpComposer({
  inputRef,
  text,
  onTextChange,
  onKeyDown,
  onDrop,
  onPaste,
  isSubmitting,
  inputHeight,
  projects,
  activeProjectId,
  onProjectSelect,
  projectError
}: DumpComposerProps) {
  const { t } = useI18n()
  const isProjectSelected = activeProjectId !== null
  const placeholder = projects.length === 0
    ? t('dump.createProjectToStart')
    : t('dump.selectProjectToStart')

  return (
    <div className="flex items-center px-4" style={{ height: `${inputHeight}px` }}>
      <ProjectSelector
        projects={projects}
        activeProjectId={activeProjectId}
        onSelect={onProjectSelect}
        allowAllProjects={false}
        emptyLabel={projects.length === 0 ? t('project.noProjects') : t('project.assignProject')}
        hasError={!!projectError}
      />

      <textarea
        ref={inputRef}
        value={text}
        onChange={onTextChange}
        onKeyDown={event => {
          void onKeyDown(event)
        }}
        onDragOver={event => { event.preventDefault(); event.stopPropagation() }}
        onDrop={onDrop}
        onPaste={event => {
          void onPaste(event)
        }}
        placeholder={isProjectSelected ? t('dump.placeholder') : placeholder}
        disabled={isSubmitting || !isProjectSelected}
        rows={1}
        className={cn(
          'flex-1 bg-transparent border-0 outline-none text-base resize-none',
          'placeholder:text-muted-foreground'
        )}
        style={{
          color: isProjectSelected ? 'var(--foreground)' : 'var(--muted-foreground)',
          height: `${inputHeight}px`,
          textAlign: text.length === 0 ? 'center' : 'left'
        }}
      />

      {isSubmitting && (
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {t('dump.saving')}
        </span>
      )}
    </div>
  )
}
