import { useEffect, useMemo } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Check, NotebookPen, X } from 'lucide-react'
import type { Project } from '@/shared/types'
import { cn } from '@/shared/cn'
import type { ReferenceTargetOption } from '../hooks/useDumpReferenceInsertion'
import { useI18n } from '../i18n'

interface InsertReferenceDialogProps {
  open: boolean
  projects: Project[]
  selectedProjectId: string | null
  selectedNotePath: string | null
  noteOptions: ReferenceTargetOption[]
  isLoadingNotes: boolean
  onProjectChange: (projectId: string) => void
  onNoteChange: (notePath: string) => void
  onConfirm: () => void | Promise<void>
  onOpenChange: (open: boolean) => void
}

export function InsertReferenceDialog({
  open,
  projects,
  selectedProjectId,
  selectedNotePath,
  noteOptions,
  isLoadingNotes,
  onProjectChange,
  onNoteChange,
  onConfirm,
  onOpenChange
}: InsertReferenceDialogProps) {
  const { t } = useI18n()
  const selectedProject = useMemo(
    () => projects.find(project => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  )

  useEffect(() => {
    if (!open) return
    if (!selectedProjectId && projects[0]) {
      onProjectChange(projects[0].id)
    }
  }, [onProjectChange, open, projects, selectedProjectId])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-xl border p-5 shadow-xl focus:outline-none'
          )}
          style={{
            backgroundColor: 'var(--background)',
            borderColor: 'var(--border)',
            color: 'var(--foreground)'
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-lg font-semibold">
                <NotebookPen className="h-5 w-5" />
                {t('workspace.insertReferenceTitle')}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {t('workspace.insertReferenceDescription')}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md p-1 transition-colors hover:bg-accent"
                aria-label={t('common.dismiss')}
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">{t('workspace.projectLabel')}</span>
              <select
                value={selectedProjectId ?? ''}
                onChange={(event) => onProjectChange(event.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{
                  backgroundColor: 'var(--secondary)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)'
                }}
              >
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">{t('workspace.noteLabel')}</span>
              <select
                value={selectedNotePath ?? ''}
                onChange={(event) => onNoteChange(event.target.value)}
                disabled={!selectedProjectId || isLoadingNotes || noteOptions.length === 0}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--secondary)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)'
                }}
              >
                {noteOptions.length === 0 ? (
                  <option value="">
                    {isLoadingNotes ? t('workspace.loadingNotes') : t('workspace.noNotesAvailable')}
                  </option>
                ) : (
                  noteOptions.map(note => (
                    <option key={note.path} value={note.path}>
                      {note.label}
                    </option>
                  ))
                )}
              </select>
            </label>

            <div
              className="rounded-lg border px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--secondary)',
                borderColor: 'var(--border)',
                color: 'var(--muted-foreground)'
              }}
            >
              {selectedProject
                ? t('workspace.referencesAppendTarget', {
                    project: selectedProject.name,
                    path: selectedNotePath ? ` / ${selectedNotePath}` : ''
                  })
                : t('workspace.chooseProjectAndNote')}
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
                style={{ color: 'var(--foreground)' }}
              >
                {t('common.cancel')}
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={() => void onConfirm()}
              disabled={!selectedProjectId || !selectedNotePath || isLoadingNotes}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm disabled:opacity-60"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-foreground)'
              }}
            >
              <Check className="h-4 w-4" />
              {t('workspace.insertReference')}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
