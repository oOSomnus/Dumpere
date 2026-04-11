import type {
  DumpEntry,
  ElectronAPI,
  Project,
  RecentVault,
  SummaryEntry,
  SummaryPanelState,
  SummarySettings,
  Tag,
  VaultState,
  WorkspaceNode,
  WorkspaceNote
} from '@/shared/types'

const now = Date.now()
const hour = 60 * 60 * 1000
const day = 24 * hour

let vaultState: VaultState = {
  isOpen: true,
  vaultPath: '/demo/dumpere-vault',
  vaultName: 'Demo Vault'
}

let recentVaults: RecentVault[] = [
  { path: '/demo/dumpere-vault', name: 'Demo Vault', lastOpened: now - 30 * 60 * 1000 }
]

let projects: Project[] = [
  { id: 'proj-release', name: 'Release Prep', createdAt: now - 14 * day },
  { id: 'proj-research', name: 'User Research', createdAt: now - 10 * day },
  { id: 'proj-brand', name: 'Brand Refresh', createdAt: now - 7 * day }
]

let tags: Tag[] = [
  { id: 'tag-ship', name: 'shipping', createdAt: now - 12 * day },
  { id: 'tag-ui', name: 'ui', createdAt: now - 11 * day },
  { id: 'tag-copy', name: 'copy', createdAt: now - 9 * day },
  { id: 'tag-bug', name: 'bugfix', createdAt: now - 8 * day }
]

let dumps: DumpEntry[] = [
  {
    id: 'dump-1',
    text: 'Shipped the upload queue polish. The success toast now appears only after the file hash finishes.',
    files: [],
    createdAt: now - 2 * hour,
    updatedAt: now - 2 * hour,
    projectId: 'proj-release',
    tags: ['tag-ship', 'tag-ui']
  },
  {
    id: 'dump-2',
    text: 'Interview notes: users want a calmer empty state and clearer pause-state messaging.',
    files: [{
      id: 'file-1',
      originalName: 'research-board.png',
      storedPath: 'mock/research-board.png',
      mimeType: 'image/png',
      size: 182034,
      kind: 'image'
    }],
    createdAt: now - 5 * hour,
    updatedAt: now - 5 * hour,
    projectId: 'proj-research',
    tags: ['tag-ui']
  },
  {
    id: 'dump-3',
    text: 'Homepage hero copy revised around speed and lower ceremony.',
    files: [],
    createdAt: now - 28 * hour,
    updatedAt: now - 28 * hour,
    projectId: 'proj-brand',
    tags: ['tag-copy']
  }
].sort((a, b) => b.createdAt - a.createdAt)

let summaries: SummaryEntry[] = [
  {
    id: 'summary-1',
    type: 'daily',
    projectId: 'proj-release',
    generatedAt: now - 90 * 60 * 1000,
    dumpCount: 1,
    content: '# Release Prep Daily Summary\n\n- Upload flow polish landed.\n- [[dump:dump-1]]'
  }
]

const workspaceNotes = new Map<string, Map<string, WorkspaceNote>>([
  ['proj-release', new Map([
    ['index.md', {
      projectId: 'proj-release',
      path: 'index.md',
      updatedAt: now - hour,
      content: '# Release checklist\n\n- [x] Upload completion polish'
    }],
    ['notes/demo-script.md', {
      projectId: 'proj-release',
      path: 'notes/demo-script.md',
      updatedAt: now - 2 * hour,
      content: '# Demo script\n\n1. Open the grid.\n2. Switch to summaries.'
    }]
  ])],
  ['proj-research', new Map([
    ['index.md', {
      projectId: 'proj-research',
      path: 'index.md',
      updatedAt: now - 3 * hour,
      content: '# Research board\n\n- Empty states should feel calmer.'
    }]
  ])]
])

let summaryPanelState: SummaryPanelState = {
  'proj-release': { workspaceMode: 'split', notePath: 'notes/demo-script.md' }
}

let lastSelectedProjectId: string | null = 'proj-release'
let summarySettings: SummarySettings = {
  provider: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4.1-mini'
}
let panelSizes = { sidebarWidth: 280, inputHeight: 104 }

const demoFilesByPath = new Map<string, string>([
  ['mock/research-board.png', `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#dbeafe"/>
          <stop offset="100%" stop-color="#fde68a"/>
        </linearGradient>
      </defs>
      <rect width="640" height="360" rx="28" fill="url(#bg)"/>
      <circle cx="154" cy="122" r="56" fill="#60a5fa" opacity="0.85"/>
      <path d="M88 276 236 152l96 84 88-66 132 106H88Z" fill="#1d4ed8" opacity="0.88"/>
    </svg>
  `)}`]
])

function cloneDump(dump: DumpEntry): DumpEntry {
  return { ...dump, files: dump.files.map((file) => ({ ...file })), tags: [...dump.tags] }
}

function cloneWorkspaceNote(note: WorkspaceNote): WorkspaceNote {
  return { ...note }
}

function ensureWorkspace(projectId: string): Map<string, WorkspaceNote> {
  const existing = workspaceNotes.get(projectId)
  if (existing) {
    return existing
  }

  const created = new Map<string, WorkspaceNote>([
    ['index.md', { projectId, path: 'index.md', content: '', updatedAt: Date.now() }]
  ])
  workspaceNotes.set(projectId, created)
  return created
}

function buildWorkspaceTree(projectId: string): WorkspaceNode[] {
  const notes = Array.from(ensureWorkspace(projectId).values()).sort((a, b) => a.path.localeCompare(b.path))
  const folders = new Map<string, WorkspaceNode>()
  const roots: WorkspaceNode[] = []

  for (const note of notes) {
    const parts = note.path.split('/')
    let parentChildren = roots
    let currentPath = ''

    for (const [index, part] of parts.entries()) {
      currentPath = currentPath ? `${currentPath}/${part}` : part
      const isLeaf = index === parts.length - 1

      if (isLeaf) {
        parentChildren.push({ type: 'note', name: part, path: currentPath })
        continue
      }

      const existing = folders.get(currentPath)
      if (existing) {
        parentChildren = existing.children ?? []
        continue
      }

      const folder: WorkspaceNode = { type: 'folder', name: part, path: currentPath, children: [] }
      folders.set(currentPath, folder)
      parentChildren.push(folder)
      parentChildren = folder.children ?? []
    }
  }

  return roots
}

function renamePath(path: string, nextName: string): string {
  const parts = path.split('/')
  parts[parts.length - 1] = nextName
  return parts.join('/')
}

function inferSummaryContent(type: 'daily' | 'weekly', projectId: string | null): string {
  const relatedDumps = dumps.filter((dump) => projectId === null || dump.projectId === projectId)
  const title = projectId
    ? `${projects.find((project) => project.id === projectId)?.name ?? 'Project'} ${type === 'daily' ? 'Daily' : 'Weekly'} Summary`
    : `${type === 'daily' ? 'Daily' : 'Weekly'} Summary`

  return [
    `# ${title}`,
    '',
    '## Highlights',
    ...relatedDumps.slice(0, 3).map((dump) => `- ${dump.text}`),
    '',
    '## References',
    ...relatedDumps.slice(0, 2).map((dump) => `- [[dump:${dump.id}]]`)
  ].join('\n')
}

export const mockElectronAPI: ElectronAPI = {
  data: {
    getDumps: async () => dumps.map(cloneDump),
    createDump: async (input) => {
      const createdDump: DumpEntry = {
        id: crypto.randomUUID(),
        text: input.text,
        files: input.filePaths.map((tempPath, index) => ({
          id: crypto.randomUUID(),
          originalName: tempPath.split('/').pop() ?? `attachment-${index + 1}`,
          storedPath: `mock/${tempPath.split('/').pop() ?? `attachment-${index + 1}`}`,
          mimeType: 'application/octet-stream',
          size: 1024,
          kind: 'file'
        })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        projectId: input.projectId,
        tags: [...input.tagIds]
      }
      dumps = [createdDump, ...dumps].sort((a, b) => b.createdAt - a.createdAt)
      return cloneDump(createdDump)
    },
    updateDump: async (id, updates) => {
      const existing = dumps.find((dump) => dump.id === id)
      const updatedDump: DumpEntry = {
        ...(existing ?? {
          id,
          text: '',
          files: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          projectId: null,
          tags: []
        }),
        ...updates,
        updatedAt: Date.now()
      }
      dumps = dumps.map((dump) => dump.id === id ? updatedDump : dump)
      return cloneDump(updatedDump)
    },
    deleteDump: async (id) => {
      dumps = dumps.filter((dump) => dump.id !== id)
    },
    getProjects: async () => [...projects],
    createProject: async (name) => {
      const project: Project = { id: crypto.randomUUID(), name, createdAt: Date.now() }
      projects = [project, ...projects]
      ensureWorkspace(project.id)
      return { ...project }
    },
    updateProject: async (id, name) => {
      const existing = projects.find((project) => project.id === id)
      const updatedProject = { id, name, createdAt: existing?.createdAt ?? Date.now() }
      projects = projects.map((project) => project.id === id ? updatedProject : project)
      return updatedProject
    },
    deleteProject: async (id) => {
      projects = projects.filter((project) => project.id !== id)
      dumps = dumps.map((dump) => dump.projectId === id ? { ...dump, projectId: null } : dump)
      summaries = summaries.filter((summary) => summary.projectId !== id)
      workspaceNotes.delete(id)
    },
    getTags: async () => [...tags],
    createTag: async (name) => {
      const existing = tags.find((tag) => tag.name === name)
      if (existing) {
        return { ...existing }
      }
      const tag: Tag = { id: crypto.randomUUID(), name, createdAt: Date.now() }
      tags = [tag, ...tags]
      return { ...tag }
    },
    deleteTag: async (id) => {
      tags = tags.filter((tag) => tag.id !== id)
      dumps = dumps.map((dump) => ({ ...dump, tags: dump.tags.filter((tagId) => tagId !== id) }))
    },
    generateSummary: async ({ type, projectId }) => {
      const relatedDumps = dumps.filter((dump) => projectId === null || dump.projectId === projectId)
      if (relatedDumps.length === 0) {
        return null
      }

      const summary: SummaryEntry = {
        id: crypto.randomUUID(),
        type,
        projectId,
        generatedAt: Date.now(),
        dumpCount: relatedDumps.length,
        content: inferSummaryContent(type, projectId)
      }
      summaries = [summary, ...summaries].sort((a, b) => b.generatedAt - a.generatedAt)
      return { ...summary }
    },
    getSummaries: async (filters) => summaries
      .filter((summary) => (filters?.type ? summary.type === filters.type : true))
      .filter((summary) => (
        typeof filters?.projectId === 'undefined'
          ? true
          : summary.projectId === filters.projectId
      ))
      .map((summary) => ({ ...summary })),
    exportSummary: async (summaryId) => summaries.some((summary) => summary.id === summaryId) ? `/tmp/${summaryId}.md` : null,
    exportDumps: async () => '/tmp/dumpere-export.zip',
    importDumps: async () => 0
  },
  workspace: {
    getTree: async (projectId) => buildWorkspaceTree(projectId),
    createFolder: async (projectId, parentPath, name) => {
      const folderPath = parentPath ? `${parentPath}/${name}` : name
      const indexPath = `${folderPath}/index.md`
      const workspace = ensureWorkspace(projectId)
      if (!workspace.has(indexPath)) {
        workspace.set(indexPath, {
          projectId,
          path: indexPath,
          content: '',
          updatedAt: Date.now()
        })
      }
      return { type: 'folder', name, path: folderPath, children: [] }
    },
    createNote: async (projectId, parentPath, name) => {
      const notePath = (parentPath ? `${parentPath}/${name}` : name).replace(/\.md$/i, '') + '.md'
      const note: WorkspaceNote = { projectId, path: notePath, content: '', updatedAt: Date.now() }
      ensureWorkspace(projectId).set(notePath, note)
      return cloneWorkspaceNote(note)
    },
    readNote: async (projectId, notePath) => {
      const note = ensureWorkspace(projectId).get(notePath)
      if (!note) {
        throw new Error(`Note not found: ${notePath}`)
      }
      return cloneWorkspaceNote(note)
    },
    updateNote: async (projectId, notePath, content) => {
      const note: WorkspaceNote = { projectId, path: notePath, content, updatedAt: Date.now() }
      ensureWorkspace(projectId).set(notePath, note)
      return cloneWorkspaceNote(note)
    },
    renameEntry: async (projectId, path, name) => {
      const workspace = ensureWorkspace(projectId)
      const nextPath = renamePath(path, name.endsWith('.md') || !path.endsWith('.md') ? name : `${name}.md`)
      const replacements = new Map<string, WorkspaceNote>()

      for (const [notePath, note] of workspace.entries()) {
        if (notePath === path || notePath.startsWith(`${path}/`)) {
          const updatedPath = notePath === path ? nextPath : `${nextPath}${notePath.slice(path.length)}`
          replacements.set(updatedPath, { ...note, path: updatedPath, updatedAt: Date.now() })
          workspace.delete(notePath)
        }
      }

      replacements.forEach((note, notePath) => workspace.set(notePath, note))
      return { path: nextPath }
    },
    deleteEntry: async (projectId, path) => {
      const workspace = ensureWorkspace(projectId)
      for (const notePath of Array.from(workspace.keys())) {
        if (notePath === path || notePath.startsWith(`${path}/`)) {
          workspace.delete(notePath)
        }
      }
    }
  },
  vault: {
    getState: async () => ({ ...vaultState }),
    create: async () => ({ ...vaultState }),
    open: async (nextVaultPath) => {
      vaultState = {
        isOpen: true,
        vaultPath: nextVaultPath ?? '/demo/dumpere-vault',
        vaultName: 'Demo Vault'
      }
      recentVaults = [
        { path: vaultState.vaultPath ?? '/demo/dumpere-vault', name: vaultState.vaultName ?? 'Demo Vault', lastOpened: Date.now() },
        ...recentVaults.filter((vault) => vault.path !== vaultState.vaultPath)
      ]
      return { ...vaultState }
    },
    close: async () => {
      vaultState = { isOpen: false, vaultPath: null, vaultName: null }
      return { ...vaultState }
    },
    onStateChange: () => () => {},
    getRecent: async () => [...recentVaults]
  },
  ui: {
    onThemeChange: () => () => {},
    getTheme: async () => 'system',
    setTheme: async () => {},
    checkSummaryHealth: async () => true,
    getSummarySettings: async () => ({ ...summarySettings }),
    updateSummarySettings: async (settings) => {
      summarySettings = { ...settings }
      return { ...summarySettings }
    },
    getSummaryPanelState: async () => ({ ...summaryPanelState }),
    setSummaryPanelState: async (state) => {
      summaryPanelState = { ...state }
    },
    getLastSelectedProjectId: async () => lastSelectedProjectId,
    setLastSelectedProjectId: async (projectId) => {
      lastSelectedProjectId = projectId
    },
    getPanelSizes: async () => ({ ...panelSizes }),
    setPanelSizes: async (sizes) => {
      panelSizes = { ...panelSizes, ...sizes }
    },
    exportSaveDialog: async (defaultName: string) => `/tmp/${defaultName}`,
    importDialog: async () => null,
    copyToClipboard: async () => {}
  },
  files: {
    openFile: async () => {},
    getFileUrl: async (path: string) => demoFilesByPath.get(path) ?? `file://${path}`,
    createTempAttachment: async (input) => `mock/${input.name}`
  }
}
