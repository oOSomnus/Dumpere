import { useCallback, useEffect, useState } from 'react'
import type { DumpEntry, Project, WorkspaceNode } from '@/shared/types'
import { getElectronAPI } from '../lib/electron-api'
import { appendMarkdownSection, formatDumpReferences } from '../lib/workpad-utils'
import { usePrompt } from './usePrompt'

export interface ReferenceTargetOption {
  path: string
  label: string
}

interface UseDumpReferenceInsertionOptions {
  projects: Project[]
  activeProjectId: string | null
}

interface UseDumpReferenceInsertionReturn {
  activeWorkspaceNotes: Record<string, string>
  isDialogOpen: boolean
  selectedProjectId: string | null
  selectedNotePath: string | null
  noteOptions: ReferenceTargetOption[]
  isLoadingNotes: boolean
  openDialogForSelection: (selectedDumps: DumpEntry[]) => Promise<void>
  handleProjectChange: (projectId: string) => void
  handleNoteChange: (notePath: string) => void
  handleOpenChange: (open: boolean) => void
  confirmInsert: () => Promise<void>
  handleActiveNotePathChange: (projectId: string, notePath: string) => void
}

function collectWorkspaceNoteOptions(nodes: WorkspaceNode[], parentPath = ''): ReferenceTargetOption[] {
  return nodes.flatMap((node) => {
    const nextPath = parentPath ? `${parentPath}/${node.name}` : node.name

    if (node.type === 'note') {
      return [{
        path: node.path,
        label: nextPath
      }]
    }

    return collectWorkspaceNoteOptions(node.children || [], nextPath)
  })
}

export function useDumpReferenceInsertion({
  projects,
  activeProjectId
}: UseDumpReferenceInsertionOptions): UseDumpReferenceInsertionReturn {
  const prompt = usePrompt()
  const [activeWorkspaceNotes, setActiveWorkspaceNotes] = useState<Record<string, string>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDumps, setSelectedDumps] = useState<DumpEntry[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedNotePath, setSelectedNotePath] = useState<string | null>(null)
  const [noteOptions, setNoteOptions] = useState<ReferenceTargetOption[]>([])
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)

  useEffect(() => {
    const loadPersistedActiveNotes = async () => {
      try {
        const api = getElectronAPI()
        const state = await api.ui.getSummaryPanelState()
        const persistedNotes = Object.fromEntries(
          Object.entries(state)
            .filter(([, value]) => Boolean(value.notePath))
            .map(([projectId, value]) => [projectId, value.notePath])
        )

        setActiveWorkspaceNotes(persistedNotes)
      } catch {
        // Silently fail and use in-memory state only.
      }
    }

    void loadPersistedActiveNotes()
  }, [])

  const resetState = useCallback(() => {
    setSelectedDumps([])
    setNoteOptions([])
    setSelectedProjectId(null)
    setSelectedNotePath(null)
  }, [])

  const loadTargetNotes = useCallback(async (projectId: string) => {
    const api = getElectronAPI()
    setIsLoadingNotes(true)

    try {
      const tree = await api.workspace.getTree(projectId)
      const nextNoteOptions = collectWorkspaceNoteOptions(tree)
      setNoteOptions(nextNoteOptions)

      const preferredPath = activeWorkspaceNotes[projectId]
      const nextPath = (
        nextNoteOptions.find(note => note.path === preferredPath)?.path ??
        nextNoteOptions[0]?.path ??
        null
      )

      setSelectedNotePath(nextPath)
      return nextNoteOptions
    } finally {
      setIsLoadingNotes(false)
    }
  }, [activeWorkspaceNotes])

  const openDialogForSelection = useCallback(async (nextSelectedDumps: DumpEntry[]) => {
    if (nextSelectedDumps.length === 0) {
      return
    }

    if (projects.length === 0) {
      prompt.info('Create a project before inserting dump references into a note.')
      return
    }

    const projectIdsInSelection = Array.from(new Set(
      nextSelectedDumps
        .map(dump => dump.projectId)
        .filter((projectId): projectId is string => Boolean(projectId))
    ))

    const defaultProjectId = (
      projectIdsInSelection.length === 1
        ? projectIdsInSelection[0]
        : activeProjectId && projects.some(project => project.id === activeProjectId)
          ? activeProjectId
          : projects[0]?.id ?? null
    )

    if (!defaultProjectId) {
      prompt.info('Create a project before inserting dump references into a note.')
      return
    }

    setSelectedDumps(nextSelectedDumps)
    setSelectedProjectId(defaultProjectId)
    setIsDialogOpen(true)
    await loadTargetNotes(defaultProjectId)
  }, [activeProjectId, loadTargetNotes, projects, prompt])

  const handleProjectChange = useCallback((projectId: string) => {
    setSelectedProjectId(projectId)
    void loadTargetNotes(projectId)
  }, [loadTargetNotes])

  const handleNoteChange = useCallback((notePath: string) => {
    setSelectedNotePath(notePath)
  }, [])

  const handleOpenChange = useCallback((open: boolean) => {
    setIsDialogOpen(open)

    if (!open) {
      resetState()
    }
  }, [resetState])

  const handleActiveNotePathChange = useCallback((projectId: string, notePath: string) => {
    setActiveWorkspaceNotes(prev => ({ ...prev, [projectId]: notePath }))

    void (async () => {
      try {
        const api = getElectronAPI()
        const currentState = await api.ui.getSummaryPanelState()
        await api.ui.setSummaryPanelState({
          ...currentState,
          [projectId]: {
            workspaceMode: currentState[projectId]?.workspaceMode ?? 'edit',
            notePath
          }
        })
      } catch {
        // Silently fail and keep local state in sync.
      }
    })()
  }, [])

  const confirmInsert = useCallback(async () => {
    if (!selectedProjectId || !selectedNotePath || selectedDumps.length === 0) {
      return
    }

    const api = getElectronAPI()
    const currentNote = await api.workspace.readNote(selectedProjectId, selectedNotePath)
    const referenceContent = formatDumpReferences(selectedDumps)
    await api.workspace.updateNote(
      selectedProjectId,
      selectedNotePath,
      appendMarkdownSection(currentNote.content, referenceContent)
    )

    handleActiveNotePathChange(selectedProjectId, selectedNotePath)
    handleOpenChange(false)
  }, [handleActiveNotePathChange, handleOpenChange, selectedDumps, selectedNotePath, selectedProjectId])

  return {
    activeWorkspaceNotes,
    isDialogOpen,
    selectedProjectId,
    selectedNotePath,
    noteOptions,
    isLoadingNotes,
    openDialogForSelection,
    handleProjectChange,
    handleNoteChange,
    handleOpenChange,
    confirmInsert,
    handleActiveNotePathChange
  }
}
