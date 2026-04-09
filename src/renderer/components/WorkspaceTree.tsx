import { useEffect, useRef, useState } from 'react'
import { Folder, FileText, FolderPlus, FilePlus, Pencil, Trash2 } from 'lucide-react'
import { WorkspaceNode } from '../lib/types'
import { cn } from '../../lib/utils'

interface WorkspaceTreeProps {
  tree: WorkspaceNode[]
  selectedPath: string | null
  onSelect: (path: string) => void
  onCreateFolder: (parentPath: string) => void
  onCreateNote: (parentPath: string) => void
  onRename: (path: string, name: string) => void | Promise<void>
  onDelete: (path: string) => void
}

interface WorkspaceTreeItemProps extends WorkspaceTreeProps {
  node: WorkspaceNode
  level: number
  editingPath: string | null
  draftName: string
  onStartRename: (path: string, currentName: string) => void
  onDraftNameChange: (value: string) => void
  onCommitRename: () => void
  onCancelRename: () => void
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
  onCancelRename
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
      onBlur={() => void onCommitRename()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          void onCommitRename()
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          onCancelRename()
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
          tree={[]}
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

  const handleStartRename = (path: string, currentName: string) => {
    setEditingPath(path)
    setDraftName(currentName.replace(/\.md$/i, ''))
  }

  const handleCancelRename = () => {
    setEditingPath(null)
    setDraftName('')
  }

  const handleCommitRename = async () => {
    const nextName = draftName.trim()
    if (!editingPath || !nextName) {
      handleCancelRename()
      return
    }

    await onRename(editingPath, nextName)
    handleCancelRename()
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
          Workspace
        </p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onCreateFolder('')} title="New folder">
            <FolderPlus className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onCreateNote('')} title="New note">
            <FilePlus className="h-4 w-4" />
          </button>
        </div>
      </div>
      {tree.map(node => (
        <WorkspaceTreeItem
          key={node.path}
          node={node}
          level={0}
          tree={tree}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onCreateFolder={onCreateFolder}
          onCreateNote={onCreateNote}
          onRename={onRename}
          onDelete={onDelete}
          editingPath={editingPath}
          draftName={draftName}
          onStartRename={handleStartRename}
          onDraftNameChange={setDraftName}
          onCommitRename={handleCommitRename}
          onCancelRename={handleCancelRename}
        />
      ))}
    </div>
  )
}
