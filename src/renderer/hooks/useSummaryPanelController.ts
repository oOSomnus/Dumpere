import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DumpEntry, Project } from '../lib/types'
import { useSummary } from './useSummary'
import { useWorkspaceTree } from './useWorkspaceTree'
import { useWorkspaceNote } from './useWorkspaceNote'
import { getElectronAPI } from '../lib/electron-api'

type WorkspaceMode = 'edit' | 'split' | 'preview'

interface UseSummaryPanelControllerOptions {
  projects: Project[]
  dumps: DumpEntry[]
  activeProjectId: string | null
  activeNotePaths: Record<string, string>
  onActiveNotePathChange: (projectId: string, notePath: string) => void
}

function buildAutoName(existingPaths: string[], parentPath: string, type: 'folder' | 'note'): string {
  const baseName = type === 'folder' ? 'New Folder' : 'New Note'
  const extension = type === 'note' ? '.md' : ''
  const normalizedParent = parentPath ? `${parentPath}/` : ''

  let index = 1
  while (true) {
    const suffix = index === 1 ? '' : ` ${index}`
    const candidate = `${baseName}${suffix}${extension}`
    if (!existingPaths.includes(`${normalizedParent}${candidate}`)) {
      return candidate
    }
    index += 1
  }
}

export function useSummaryPanelController({
  projects,
  dumps,
  activeProjectId,
  activeNotePaths,
  onActiveNotePathChange
}: UseSummaryPanelControllerOptions) {
  const [summaryType, setSummaryType] = useState<'daily' | 'weekly'>('daily')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(activeProjectId)
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('edit')
  const [copied, setCopied] = useState(false)
  const [selectedDump, setSelectedDump] = useState<DumpEntry | null>(null)
  const { currentSummary, summaries, isLoading, error, generateSummary, clearError, setCurrentSummary } = useSummary()
  const {
    tree,
    isLoading: isWorkspaceLoading,
    error: workspaceError,
    refresh: refreshWorkspace,
    createFolder,
    createNote,
    renameEntry,
    deleteEntry,
    notePaths
  } = useWorkspaceTree(selectedProjectId)

  const activeNotePath = selectedProjectId ? activeNotePaths[selectedProjectId] ?? null : null
  const effectiveNotePath = selectedProjectId && activeNotePath && notePaths.includes(activeNotePath)
    ? activeNotePath
    : null

  const {
    content: noteContent,
    setContent: setNoteContent,
    isLoading: isNoteLoading,
    isSaving: isNoteSaving,
    error: noteError,
    refresh: refreshNote,
    saveNow: saveNoteNow,
    note
  } = useWorkspaceNote(selectedProjectId, effectiveNotePath)

  useEffect(() => {
    setSelectedProjectId(activeProjectId)
  }, [activeProjectId])

  useEffect(() => {
    if (!selectedProjectId) {
      return
    }

    if (activeNotePath && !notePaths.includes(activeNotePath)) {
      const nextPath = notePaths[0] ?? ''
      onActiveNotePathChange(selectedProjectId, nextPath)
    }
  }, [activeNotePath, notePaths, onActiveNotePathChange, selectedProjectId])

  const filteredSummaries = useMemo(() => {
    return summaries.filter(summary => (
      summary.type === summaryType &&
      summary.projectId === selectedProjectId
    ))
  }, [selectedProjectId, summaries, summaryType])

  const dumpMap = useMemo(() => new Map(dumps.map(dump => [dump.id, dump])), [dumps])

  useEffect(() => {
    if (filteredSummaries.length === 0) {
      setCurrentSummary(null)
      return
    }

    const stillVisible = currentSummary && filteredSummaries.some(summary => summary.id === currentSummary.id)
    if (!stillVisible) {
      setCurrentSummary(filteredSummaries[0] ?? null)
    }
  }, [currentSummary, filteredSummaries, setCurrentSummary])

  const handleGenerate = useCallback(async () => {
    try {
      await saveNoteNow()
      await generateSummary(summaryType, selectedProjectId)
      await refreshWorkspace()
      await refreshNote()
    } catch {
      // Error state is surfaced by the underlying hooks.
    }
  }, [generateSummary, refreshNote, refreshWorkspace, saveNoteNow, selectedProjectId, summaryType])

  const handleExport = useCallback(async () => {
    if (currentSummary) {
      const api = getElectronAPI()
      await api.exportSummary(currentSummary.id)
    }
  }, [currentSummary])

  const handleCopySummary = useCallback(async () => {
    if (currentSummary?.content) {
      await navigator.clipboard.writeText(currentSummary.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [currentSummary])

  const projectName = selectedProjectId
    ? projects.find(project => project.id === selectedProjectId)?.name ?? 'Unknown Project'
    : 'All Projects'

  const handleCreateFolder = useCallback(async (parentPath: string) => {
    const name = buildAutoName(notePaths.concat(tree.map(node => node.path)), parentPath, 'folder')
    await createFolder(parentPath, name)
  }, [createFolder, notePaths, tree])

  const handleCreateNote = useCallback(async (parentPath: string) => {
    const name = buildAutoName(notePaths, parentPath, 'note')
    const nextNote = await createNote(parentPath, name)
    if (selectedProjectId && nextNote) {
      onActiveNotePathChange(selectedProjectId, nextNote.path)
    }
  }, [createNote, notePaths, onActiveNotePathChange, selectedProjectId])

  const handleRenameEntryWithName = useCallback(async (path: string, name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) return
    const result = await renameEntry(path, trimmedName)
    if (selectedProjectId && result && effectiveNotePath === path) {
      onActiveNotePathChange(selectedProjectId, result.path)
    }
  }, [effectiveNotePath, onActiveNotePathChange, renameEntry, selectedProjectId])

  const handleDeleteEntry = useCallback(async (path: string) => {
    if (!window.confirm(`Delete ${path}? This cannot be undone.`)) {
      return
    }

    await deleteEntry(path)
    if (selectedProjectId && effectiveNotePath === path) {
      onActiveNotePathChange(selectedProjectId, '')
    }
  }, [deleteEntry, effectiveNotePath, onActiveNotePathChange, selectedProjectId])

  const handleProjectSelectionChange = useCallback((projectId: string | null) => {
    setSelectedProjectId(projectId)
    if (projectId) {
      onActiveNotePathChange(projectId, '')
    }
  }, [onActiveNotePathChange])

  return {
    summaryType,
    setSummaryType,
    selectedProjectId,
    handleProjectSelectionChange,
    workspaceMode,
    setWorkspaceMode,
    copied,
    selectedDump,
    setSelectedDump,
    currentSummary,
    setCurrentSummary,
    filteredSummaries,
    projectName,
    dumpMap,
    tree,
    notePaths,
    effectiveNotePath,
    note,
    noteContent,
    setNoteContent,
    isLoading,
    error,
    clearError,
    isWorkspaceLoading,
    workspaceError,
    isNoteLoading,
    isNoteSaving,
    noteError,
    handleGenerate,
    handleExport,
    handleCopySummary,
    handleCreateFolder,
    handleCreateNote,
    handleRenameEntryWithName,
    handleDeleteEntry
  }
}
