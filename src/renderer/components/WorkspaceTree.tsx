import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { Folder, FileText, FolderPlus, FilePlus, Pencil, Trash2 } from 'lucide-react'
import type { WorkspaceNode, WorkspaceNote } from '@/shared/types'
import { cn } from '@/shared/cn'

type CreatedWorkspaceEntry = Pick<WorkspaceNode, 'type' | 'name' | 'path'> | WorkspaceNote

function getEntryBaseName(entry: CreatedWorkspaceEntry): string {
  if ('name' in entry) {
    return entry.name
  }

  return entry.path.split('/').pop() ?? ''
}

function findNodeByPath(nodes: WorkspaceNode[], path: string): WorkspaceNode | null {
  for (const node of nodes) {
    if (node.path === path) {
      return node
    }

    if (node.type === 'folder' && node.children?.length) {
      const nestedMatch = findNodeByPath(node.children, path)
      if (nestedMatch) {
        return nestedMatch
      }
    }
  }

  return null
}

function buildOptimisticNode(entry: CreatedWorkspaceEntry): WorkspaceNode {
  if ('type' in entry) {
    return entry.type === 'folder'
      ? { type: 'folder', name: entry.name, path: entry.path, children: [] }
      : { type: 'note', name: entry.name, path: entry.path }
  }

  const name = getEntryBaseName(entry)
  return { type: 'note', name, path: entry.path }
}

function insertOptimisticNode(nodes: WorkspaceNode[], optimisticNode: WorkspaceNode): WorkspaceNode[] {
  if (findNodeByPath(nodes, optimisticNode.path)) {
    return nodes
  }

  const pathSegments = optimisticNode.path.split('/').filter(Boolean)
  if (pathSegments.length <= 1) {
    return [...nodes, optimisticNode]
  }

  const parentPath = pathSegments.slice(0, -1).join('/')

  return nodes.map(node => {
    if (node.type === 'folder' && node.path === parentPath) {
      return {
        ...node,
        children: [...(node.children ?? []), optimisticNode]
      }
    }

    if (node.type === 'folder' && node.children?.length) {
      return {
        ...node,
        children: insertOptimisticNode(node.children, optimisticNode)
      }
    }

    return node
  })
}

interface WorkspaceTreeProps {
  tree: WorkspaceNode[]
  selectedPath: string | null
  onSelect: (path: string) => void
  onCreateFolder: (parentPath: string) => Promise<CreatedWorkspaceEntry | null>
  onCreateNote: (parentPath: string) => Promise<CreatedWorkspaceEntry | null>
  onRename: (path: string, name: string) => Promise<void> | Promise<{ path: string }> | void
  onDelete: (path: string, options?: { skipConfirm?: boolean }) => Promise<void> | void
}

interface WorkspaceTreeItemProps {
  node: WorkspaceNode
  level: number
  selectedPath: string | null
  onSelect: (path: string) => void
  onCreateFolder: (parentPath: string) => Promise<void> | void
  onCreateNote: (parentPath: string) => Promise<void> | void
  onRename: (path: string, name: string) => Promise<void> | Promise<{ path: string }> | void
  onDelete: (path: string, options?: { skipConfirm?: boolean }) => Promise<void> | void
  editingPath: string | null
  draftName: string
  onStartRename: (path: string, currentName: string) => void
  onDraftNameChange: (value: string) => void
  onCommitRename: () => void
  onCancelRename: () => Promise<void> | void
  skipBlurCommitRef: MutableRefObject<boolean>
}

function WorkspaceTreeItem({
  node,
  level,
  selectedPath,
  onSelect,
  onCreateFolder,
  onCreateNote,
  onRename,
  onDelete,
  editingPath,
  draftName,
  onStartRename,
  onDraftNameChange,
  onCommitRename,
  onCancelRename,
  skipBlurCommitRef
}: WorkspaceTreeItemProps) {
  const isSelected = selectedPath === node.path
  const isEditing = editingPath === node.path
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const title = isEditing ? (
    <input
      ref={inputRef}
      value={draftName}
      onChange={(event) => onDraftNameChange(event.target.value)}
      onBlur={() => {
        if (skipBlurCommitRef.current) {
          skipBlurCommitRef.current = false
          return
        }

        void onCommitRename()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          void onCommitRename()
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          skipBlurCommitRef.current = true
          void onCancelRename()
        }
      }}
      className="min-w-0 flex-1 rounded border px-2 py-1 text-sm outline-none"
      style={{
        borderColor: 'var(--border)',
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)'
      }}
    />
  ) : (
    <span className="truncate">{node.name}</span>
  )

  if (node.type === 'note') {
    return (
      <div
        className={cn('flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-accent')}
        style={{
          paddingLeft: `${level * 14 + 8}px`,
          backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
          color: isSelected ? 'var(--accent-foreground)' : 'var(--foreground)'
        }}
      >
        <button
          type="button"
          onClick={() => !isEditing && onSelect(node.path)}
          className="flex min-w-0 flex-1 items-center gap-2"
        >
          <FileText className="h-4 w-4 shrink-0" />
          {title}
        </button>
        {!isEditing && (
          <span className="ml-2 flex items-center gap-1">
            <button type="button" onClick={() => onStartRename(node.path, node.name)} title="Rename note">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => onDelete(node.path)} title="Delete note">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div
        className="flex items-center justify-between rounded-lg px-2 py-2 text-sm"
        style={{
          paddingLeft: `${level * 14 + 8}px`,
          color: 'var(--foreground)'
        }}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <Folder className="h-4 w-4 shrink-0" />
          {title}
        </span>
        {!isEditing && (
          <span className="ml-2 flex items-center gap-1">
            <button type="button" onClick={() => onCreateFolder(node.path)} title="New folder">
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => onCreateNote(node.path)} title="New note">
              <FilePlus className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => onStartRename(node.path, node.name)} title="Rename folder">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => onDelete(node.path)} title="Delete folder">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
      </div>
      {(node.children || []).map(child => (
        <WorkspaceTreeItem
          key={child.path}
          node={child}
          level={level + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onCreateFolder={onCreateFolder}
          onCreateNote={onCreateNote}
          onRename={onRename}
          onDelete={onDelete}
          editingPath={editingPath}
          draftName={draftName}
          onStartRename={onStartRename}
          onDraftNameChange={onDraftNameChange}
          onCommitRename={onCommitRename}
          onCancelRename={onCancelRename}
          skipBlurCommitRef={skipBlurCommitRef}
        />
      ))}
    </div>
  )
}

export function WorkspaceTree({
  tree,
  selectedPath,
  onSelect,
  onCreateFolder,
  onCreateNote,
  onRename,
  onDelete
}: WorkspaceTreeProps) {
  const [editingPath, setEditingPath] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [pendingCreatedPath, setPendingCreatedPath] = useState<string | null>(null)
  const [optimisticCreatedNode, setOptimisticCreatedNode] = useState<WorkspaceNode | null>(null)
  const skipBlurCommitRef = useRef(false)

  useEffect(() => {
    if (optimisticCreatedNode && findNodeByPath(tree, optimisticCreatedNode.path)) {
      setOptimisticCreatedNode(null)
    }
  }, [optimisticCreatedNode, tree])

  const handleStartRename = (path: string, currentName: string) => {
    setEditingPath(path)
    setDraftName(currentName.replace(/\.md$/i, ''))
  }

  const clearEditingState = () => {
    setEditingPath(null)
    setDraftName('')
  }

  const handleCancelRename = async () => {
    if (pendingCreatedPath && editingPath === pendingCreatedPath) {
      await onDelete(pendingCreatedPath, { skipConfirm: true })
      setPendingCreatedPath(null)
      setOptimisticCreatedNode(null)
    }

    clearEditingState()
  }

  const handleCommitRename = async () => {
    const nextName = draftName.trim()
    if (!editingPath || !nextName) {
      handleCancelRename()
      return
    }

    await onRename(editingPath, nextName)
    setPendingCreatedPath(null)
    setOptimisticCreatedNode(null)
    clearEditingState()
  }

  const handleCreateAndRename = async (createEntry: (parentPath: string) => Promise<CreatedWorkspaceEntry | null>, parentPath: string) => {
    const createdEntry = await createEntry(parentPath)
    if (!createdEntry) {
      return
    }

    setPendingCreatedPath(createdEntry.path)
    setOptimisticCreatedNode(buildOptimisticNode(createdEntry))
    handleStartRename(createdEntry.path, getEntryBaseName(createdEntry))
  }

  const handleCreateFolderAndRename = (parentPath: string) => handleCreateAndRename(onCreateFolder, parentPath)
  const handleCreateNoteAndRename = (parentPath: string) => handleCreateAndRename(onCreateNote, parentPath)
  const displayTree = optimisticCreatedNode ? insertOptimisticNode(tree, optimisticCreatedNode) : tree

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
          Workspace
        </p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => void handleCreateFolderAndRename('')} title="New folder">
            <FolderPlus className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => void handleCreateNoteAndRename('')} title="New note">
            <FilePlus className="h-4 w-4" />
          </button>
        </div>
      </div>
      {displayTree.map(node => (
        <WorkspaceTreeItem
          key={node.path}
          node={node}
          level={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onCreateFolder={handleCreateFolderAndRename}
          onCreateNote={handleCreateNoteAndRename}
          onRename={onRename}
          onDelete={onDelete}
          editingPath={editingPath}
          draftName={draftName}
          onStartRename={handleStartRename}
          onDraftNameChange={setDraftName}
          onCommitRename={handleCommitRename}
          onCancelRename={handleCancelRename}
          skipBlurCommitRef={skipBlurCommitRef}
        />
      ))}
    </div>
  )
}
