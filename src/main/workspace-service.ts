import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'fs/promises'
import { basename, dirname, extname, join, resolve } from 'path'
import { getVaultState } from './vault-service'
import type { WorkspaceNode, WorkspaceNote } from '../renderer/lib/types'

const WORKSPACES_DIR = 'workspaces'
const DEFAULT_NOTE_PATH = 'index.md'

function requireVaultPath(): string {
  const state = getVaultState()
  if (!state.isOpen || !state.vaultPath) {
    throw new Error('No vault open')
  }

  return state.vaultPath
}

function getProjectWorkspaceRoot(projectId: string): string {
  const vaultPath = requireVaultPath()
  return join(vaultPath, '.dumpere', WORKSPACES_DIR, projectId)
}

function normalizeRelativePath(relativePath?: string): string {
  if (!relativePath) {
    return ''
  }

  return relativePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
}

function resolveWorkspacePath(projectId: string, relativePath = ''): string {
  const root = getProjectWorkspaceRoot(projectId)
  const safeRelativePath = normalizeRelativePath(relativePath)
  const fullPath = resolve(root, safeRelativePath || '.')

  if (fullPath !== root && !fullPath.startsWith(`${root}/`) && !fullPath.startsWith(`${root}\\`)) {
    throw new Error('Invalid workspace path')
  }

  return fullPath
}

function normalizeEntryName(name: string, type: 'folder' | 'note'): string {
  const trimmed = name.trim()

  if (!trimmed) {
    throw new Error(`${type === 'folder' ? 'Folder' : 'Note'} name is required`)
  }

  if (trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error('Names cannot contain path separators')
  }

  const cleaned = trimmed.replace(/[^\w\s.-]+/g, '-').trim()
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    throw new Error('Invalid name')
  }

  if (type === 'note') {
    return cleaned.toLowerCase().endsWith('.md') ? cleaned : `${cleaned}.md`
  }

  return cleaned
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function buildWorkspaceTreeFromDir(projectId: string, relativeDir = ''): Promise<WorkspaceNode[]> {
  const dirPath = resolveWorkspacePath(projectId, relativeDir)
  const entries = await readdir(dirPath, { withFileTypes: true })
  const nodes = (await Promise.all(entries.map(async (entry): Promise<WorkspaceNode | null> => {
    const childPath = normalizeRelativePath(join(relativeDir, entry.name))

    if (entry.isDirectory()) {
      return {
        type: 'folder' as const,
        name: entry.name,
        path: childPath,
        children: await buildWorkspaceTreeFromDir(projectId, childPath)
      }
    }

    if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') {
      if (!relativeDir && entry.name === DEFAULT_NOTE_PATH) {
        return null
      }

      return {
        type: 'note' as const,
        name: entry.name,
        path: childPath
      }
    }

    return null
  }))).filter((node): node is WorkspaceNode => node !== null)

  return nodes
    .sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1
      }

      if (a.path === DEFAULT_NOTE_PATH) return -1
      if (b.path === DEFAULT_NOTE_PATH) return 1
      return a.name.localeCompare(b.name)
    })
}

export async function ensureProjectWorkspace(projectId: string, legacyContent = ''): Promise<void> {
  const root = getProjectWorkspaceRoot(projectId)
  await mkdir(root, { recursive: true })

  const indexPath = resolveWorkspacePath(projectId, DEFAULT_NOTE_PATH)
  if (!(await pathExists(indexPath))) {
    await writeFile(indexPath, legacyContent, 'utf8')
  }
}

export async function deleteProjectWorkspace(projectId: string): Promise<void> {
  const root = getProjectWorkspaceRoot(projectId)
  await rm(root, { recursive: true, force: true })
}

export async function getWorkspaceTree(projectId: string, legacyContent = ''): Promise<WorkspaceNode[]> {
  await ensureProjectWorkspace(projectId, legacyContent)
  return buildWorkspaceTreeFromDir(projectId)
}

export async function createWorkspaceFolder(projectId: string, parentPath: string, name: string): Promise<WorkspaceNode> {
  await ensureProjectWorkspace(projectId)
  const nextName = normalizeEntryName(name, 'folder')
  const fullPath = resolveWorkspacePath(projectId, join(normalizeRelativePath(parentPath), nextName))
  await mkdir(fullPath, { recursive: false })

  return {
    type: 'folder',
    name: nextName,
    path: normalizeRelativePath(join(parentPath, nextName)),
    children: []
  }
}

export async function createWorkspaceNote(projectId: string, parentPath: string, name: string): Promise<WorkspaceNote> {
  await ensureProjectWorkspace(projectId)
  const nextName = normalizeEntryName(name, 'note')
  const relativePath = normalizeRelativePath(join(parentPath, nextName))
  const fullPath = resolveWorkspacePath(projectId, relativePath)
  await writeFile(fullPath, '', { flag: 'wx', encoding: 'utf8' })

  return {
    projectId,
    path: relativePath,
    content: '',
    updatedAt: Date.now()
  }
}

export async function readWorkspaceNote(projectId: string, notePath = DEFAULT_NOTE_PATH, legacyContent = ''): Promise<WorkspaceNote> {
  await ensureProjectWorkspace(projectId, legacyContent)
  const relativePath = normalizeRelativePath(notePath || DEFAULT_NOTE_PATH) || DEFAULT_NOTE_PATH
  const fullPath = resolveWorkspacePath(projectId, relativePath)
  const content = await readFile(fullPath, 'utf8')
  const entryStat = await stat(fullPath)

  return {
    projectId,
    path: relativePath,
    content,
    updatedAt: entryStat.mtimeMs
  }
}

export async function updateWorkspaceNote(projectId: string, notePath: string, content: string): Promise<WorkspaceNote> {
  await ensureProjectWorkspace(projectId)
  const relativePath = normalizeRelativePath(notePath || DEFAULT_NOTE_PATH) || DEFAULT_NOTE_PATH
  const fullPath = resolveWorkspacePath(projectId, relativePath)
  await writeFile(fullPath, content, 'utf8')
  const entryStat = await stat(fullPath)

  return {
    projectId,
    path: relativePath,
    content,
    updatedAt: entryStat.mtimeMs
  }
}

export async function renameWorkspaceEntry(projectId: string, entryPath: string, name: string): Promise<{ path: string }> {
  await ensureProjectWorkspace(projectId)
  const currentRelativePath = normalizeRelativePath(entryPath)
  const currentFullPath = resolveWorkspacePath(projectId, currentRelativePath)
  const entryStat = await stat(currentFullPath)
  const nextName = normalizeEntryName(name, entryStat.isDirectory() ? 'folder' : 'note')
  const nextRelativePath = normalizeRelativePath(join(dirname(currentRelativePath), nextName))
  const nextFullPath = resolveWorkspacePath(projectId, nextRelativePath)
  await rename(currentFullPath, nextFullPath)

  return { path: nextRelativePath }
}

export async function deleteWorkspaceEntry(projectId: string, entryPath: string): Promise<void> {
  await ensureProjectWorkspace(projectId)
  const relativePath = normalizeRelativePath(entryPath)
  if (!relativePath || relativePath === DEFAULT_NOTE_PATH) {
    throw new Error('The default note cannot be deleted')
  }

  const fullPath = resolveWorkspacePath(projectId, relativePath)
  await rm(fullPath, { recursive: true, force: false })
}

export function getDefaultWorkspaceNotePath(): string {
  return DEFAULT_NOTE_PATH
}

export function isDefaultWorkspaceNotePath(entryPath: string | null | undefined): boolean {
  return normalizeRelativePath(entryPath || '') === DEFAULT_NOTE_PATH
}

export function getWorkspaceEntryName(entryPath: string): string {
  return basename(entryPath)
}
