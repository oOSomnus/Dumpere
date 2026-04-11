import type {
  DumpEntry,
  ElectronAPI,
  Project,
  RecentVault,
  StoredFile,
  SummaryEntry,
  SummarySettings,
  Tag,
  VaultState,
  WorkspaceNode,
  WorkspaceNote
} from './types'

const now = Date.now()
const hour = 60 * 60 * 1000
const day = 24 * hour

const demoProjects: Project[] = [
  { id: 'proj-release', name: 'Release Prep', createdAt: now - 14 * day },
  { id: 'proj-research', name: 'User Research', createdAt: now - 10 * day },
  { id: 'proj-brand', name: 'Brand Refresh', createdAt: now - 7 * day }
]

const demoTags: Tag[] = [
  { id: 'tag-ship', name: 'shipping', createdAt: now - 12 * day },
  { id: 'tag-ui', name: 'ui', createdAt: now - 11 * day },
  { id: 'tag-copy', name: 'copy', createdAt: now - 9 * day },
  { id: 'tag-bug', name: 'bugfix', createdAt: now - 8 * day },
  { id: 'tag-research', name: 'research', createdAt: now - 6 * day }
]

const imageSvgDataUrl = encodeURIComponent(`
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
`)

const demoFilesByPath = new Map<string, string>([
  ['mock/research-board.png', `data:image/svg+xml;charset=utf-8,${imageSvgDataUrl}`]
])

const demoDumps: DumpEntry[] = [
  {
    id: 'dump-1',
    text: 'Shipped the upload queue polish. The success toast now appears only after the file hash finishes, so the timeline feels less jumpy.',
    files: [],
    createdAt: now - 2 * hour,
    updatedAt: now - 2 * hour,
    projectId: 'proj-release',
    tags: ['tag-ship', 'tag-ui']
  },
  {
    id: 'dump-2',
    text: 'Interview notes from today: users want a calmer empty state and a clearer reason when sync is paused.',
    files: [
      {
        id: 'file-1',
        originalName: 'research-board.png',
        storedPath: 'mock/research-board.png',
        mimeType: 'image/png',
        size: 182034
      }
    ],
    createdAt: now - 5 * hour,
    updatedAt: now - 5 * hour,
    projectId: 'proj-research',
    tags: ['tag-research', 'tag-ui']
  },
  {
    id: 'dump-3',
    text: 'Homepage hero copy revised. New direction emphasizes speed, lower ceremony, and daily team rhythm.',
    files: [],
    createdAt: now - 28 * hour,
    updatedAt: now - 28 * hour,
    projectId: 'proj-brand',
    tags: ['tag-copy']
  },
  {
    id: 'dump-4',
    text: 'Fixed the duplicate tag edge case when users paste the same term with different capitalization.',
    files: [],
    createdAt: now - 38 * hour,
    updatedAt: now - 38 * hour,
    projectId: 'proj-release',
    tags: ['tag-bug']
  },
  {
    id: 'dump-5',
    text: 'Collected five screenshots from support tickets to compare how the summary panel performs on smaller laptop screens.',
    files: [],
    createdAt: now - 3 * day,
    updatedAt: now - 3 * day,
    projectId: 'proj-research',
    tags: ['tag-research']
  }
]

const demoSummaries: SummaryEntry[] = [
  {
    id: 'summary-1',
    type: 'daily',
    projectId: 'proj-release',
    generatedAt: now - 90 * 60 * 1000,
    dumpCount: 2,
    content: [
      '# Release Prep Daily Summary',
      '',
      '## Highlights',
      '- Upload flow polish is now less noisy during completion.',
      '- Duplicate tag handling is fixed for mixed-case paste input.',
      '',
      '## Risks',
      '- We still need one more pass on empty-state copy before the next demo.',
      '',
      '## References',
      '- [[dump:dump-1]]',
      '- [[dump:dump-4]]'
    ].join('\n')
  },
  {
    id: 'summary-2',
    type: 'daily',
    projectId: 'proj-research',
    generatedAt: now - 4 * hour,
    dumpCount: 2,
    content: [
      '# User Research Daily Summary',
      '',
      '## Signals',
      '- Participants want calmer defaults and better pause-state explanations.',
      '- Support screenshots show cramped layouts on smaller laptops.',
      '',
      '## Next Step',
      '- Use the workspace notes to narrow recommendations for next week.',
      '',
      '## References',
      '- [[dump:dump-2]]',
      '- [[dump:dump-5]]'
    ].join('\n')
  },
  {
    id: 'summary-3',
    type: 'weekly',
    projectId: 'proj-release',
    generatedAt: now - 30 * hour,
    dumpCount: 2,
    content: [
      '# Release Prep Weekly Summary',
      '',
      'The team closed the week with fewer rough edges in tagging and upload completion feedback.',
      '',
      '## Momentum',
      '- Faster feedback after upload completion',
      '- Cleaner tag management in the composer',
      '',
      '## References',
      '- [[dump:dump-1]]',
      '- [[dump:dump-4]]'
    ].join('\n')
  }
]

const demoWorkspaceNotes = new Map<string, Map<string, WorkspaceNote>>([
  ['proj-release', new Map([
    ['index.md', {
      projectId: 'proj-release',
      path: 'index.md',
      updatedAt: now - hour,
      content: [
        '# Release checklist',
        '',
        '- [x] Upload completion polish',
        '- [x] Tag dedupe fix',
        '- [ ] Final empty-state review',
        '',
        '## Latest dump',
        '[[dump:dump-1]]'
      ].join('\n')
    }],
    ['notes/demo-script.md', {
      projectId: 'proj-release',
      path: 'notes/demo-script.md',
      updatedAt: now - 2 * hour,
      content: [
        '# Demo script',
        '',
        '1. Open the grid and show how quickly new dumps land.',
        '2. Switch to summaries to show linked source material.',
        '3. End in settings to explain model/provider configuration.'
      ].join('\n')
    }]
  ])],
  ['proj-research', new Map([
    ['index.md', {
      projectId: 'proj-research',
      path: 'index.md',
      updatedAt: now - 3 * hour,
      content: [
        '# Research board',
        '',
        '## What we heard',
        '- Empty states should feel calmer.',
        '- Status messaging should explain why sync is paused.',
        '',
        '## Source',
        '[[dump:dump-2]]'
      ].join('\n')
    }],
    ['findings/mobile-layout.md', {
      projectId: 'proj-research',
      path: 'findings/mobile-layout.md',
      updatedAt: now - 4 * hour,
      content: 'Smaller laptop screens lose too much width in the summary workspace split view.'
    }]
  ])],
  ['proj-brand', new Map([
    ['index.md', {
      projectId: 'proj-brand',
      path: 'index.md',
      updatedAt: now - 26 * hour,
      content: [
        '# Messaging direction',
        '',
        'Short, direct language performs better than feature-heavy paragraphs.',
        '',
        '[[dump:dump-3]]'
      ].join('\n')
    }]
  ])]
])

const demoSummaryPanelState: Record<string, { workspaceMode: 'edit' | 'split' | 'preview'; notePath: string }> = {
  'proj-release': { workspaceMode: 'split', notePath: 'notes/demo-script.md' },
  'proj-research': { workspaceMode: 'preview', notePath: 'index.md' }
}

let vaultState: VaultState = {
  isOpen: true,
  vaultPath: '/demo/dumpere-vault',
  vaultName: 'Demo Vault'
}

let recentVaults: RecentVault[] = [
  { path: '/demo/dumpere-vault', name: 'Demo Vault', lastOpened: now - 30 * 60 * 1000 }
]

let projects = [...demoProjects]
let tags = [...demoTags]
let dumps = [...demoDumps].sort((a, b) => b.createdAt - a.createdAt)
let summaries = [...demoSummaries].sort((a, b) => b.generatedAt - a.generatedAt)
let lastSelectedProjectId: string | null = 'proj-release'
let summarySettings: SummarySettings = {
  provider: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4.1-mini'
}
let panelSizes = { sidebarWidth: 280, inputHeight: 104 }

function cloneDump(dump: DumpEntry): DumpEntry {
  return { ...dump, files: dump.files.map(file => ({ ...file })), tags: [...dump.tags] }
}

function cloneSummary(summary: SummaryEntry): SummaryEntry {
  return { ...summary }
}

function cloneWorkspaceNote(note: WorkspaceNote): WorkspaceNote {
  return { ...note }
}

function ensureWorkspace(projectId: string): Map<string, WorkspaceNote> {
  const existing = demoWorkspaceNotes.get(projectId)
  if (existing) {
    return existing
  }

  const created = new Map<string, WorkspaceNote>([
    ['index.md', { projectId, path: 'index.md', content: '', updatedAt: Date.now() }]
  ])
  demoWorkspaceNotes.set(projectId, created)
  return created
}

function buildWorkspaceTree(projectId: string): WorkspaceNode[] {
  const workspace = ensureWorkspace(projectId)
  const root = new Map<string, WorkspaceNode>()

  const getFolderChildren = (node: WorkspaceNode): WorkspaceNode[] => {
    if (!node.children) {
      node.children = []
    }
    return node.children
  }

  for (const note of workspace.values()) {
    const parts = note.path.split('/')
    let currentLevel = root
    let currentChildren: WorkspaceNode[] | null = null
    let currentPath = ''

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part
      const isNote = index === parts.length - 1

      if (isNote) {
        const noteNode: WorkspaceNode = { type: 'note', name: part, path: currentPath }
        if (currentChildren) {
          currentChildren.push(noteNode)
        } else {
          root.set(currentPath, noteNode)
        }
        return
      }

      const existing = currentLevel.get(currentPath)
      if (existing) {
        currentChildren = getFolderChildren(existing)
        return
      }

      const folderNode: WorkspaceNode = { type: 'folder', name: part, path: currentPath, children: [] }
      if (currentChildren) {
        currentChildren.push(folderNode)
      } else {
        root.set(currentPath, folderNode)
      }
      currentLevel.set(currentPath, folderNode)
      currentChildren = folderNode.children ?? []
    })
  }

  const sortNodes = (nodes: WorkspaceNode[]): WorkspaceNode[] => {
    return nodes
      .map(node => node.type === 'folder' && node.children
        ? { ...node, children: sortNodes(node.children) }
        : node)
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })
  }

  return sortNodes(Array.from(root.values()).filter(node => !node.path.includes('/')))
}

function inferSummaryContent(type: 'daily' | 'weekly', projectId: string | null, relatedDumps: DumpEntry[]): string {
  const title = projectId
    ? `${projects.find(project => project.id === projectId)?.name ?? 'Project'} ${type === 'daily' ? 'Daily' : 'Weekly'} Summary`
    : `${type === 'daily' ? 'Daily' : 'Weekly'} Summary`

  const bullets = relatedDumps.slice(0, 3).map(dump => `- ${dump.text}`)
  const refs = relatedDumps.slice(0, 2).map(dump => `- [[dump:${dump.id}]]`)

  return [
    `# ${title}`,
    '',
    '## Highlights',
    ...bullets,
    '',
    '## References',
    ...refs
  ].join('\n')
}

function renamePath(path: string, nextName: string): string {
  const parts = path.split('/')
  parts[parts.length - 1] = nextName
  return parts.join('/')
}

export const mockElectronAPI: ElectronAPI = {
  copyFiles: async (tempPaths: string[]) => tempPaths.map((tempPath, index) => ({
    id: crypto.randomUUID(),
    originalName: tempPath.split('/').pop() ?? `attachment-${index + 1}`,
    storedPath: `mock/${tempPath.split('/').pop() ?? `attachment-${index + 1}`}`,
    mimeType: 'application/octet-stream',
    size: 1024
  })),
  deleteFile: async () => {},
  openFile: async () => {},
  getFileUrl: async (path: string) => demoFilesByPath.get(path) ?? `file://${path}`,
  getDumps: async () => dumps.map(cloneDump),
  saveDump: async (dump) => {
    const savedDump: DumpEntry = { ...dump, id: crypto.randomUUID() }
    dumps = [savedDump, ...dumps].sort((a, b) => b.createdAt - a.createdAt)
    return cloneDump(savedDump)
  },
  deleteDump: async (id: string) => {
    dumps = dumps.filter(dump => dump.id !== id)
  },
  getProjects: async () => [...projects],
  saveProject: async (project) => {
    projects = [project, ...projects]
    ensureWorkspace(project.id)
    return { ...project }
  },
  updateProject: async (id, name) => {
    const existing = projects.find(project => project.id === id)
    const updatedProject = { id, name, createdAt: existing?.createdAt ?? Date.now() }
    projects = projects.map(project => project.id === id ? updatedProject : project)
    return updatedProject
  },
  deleteProject: async (id) => {
    projects = projects.filter(project => project.id !== id)
    dumps = dumps.map(dump => dump.projectId === id ? { ...dump, projectId: null } : dump)
    summaries = summaries.filter(summary => summary.projectId !== id)
    demoWorkspaceNotes.delete(id)
  },
  getTags: async () => [...tags],
  saveTag: async (tag) => {
    tags = [tag, ...tags]
    return { ...tag }
  },
  deleteTag: async (id) => {
    tags = tags.filter(tag => tag.id !== id)
    dumps = dumps.map(dump => ({ ...dump, tags: dump.tags.filter(tagId => tagId !== id) }))
  },
  getDumpOrder: async () => dumps.map(dump => dump.id),
  setDumpOrder: async (ids) => {
    const order = new Map(ids.map((id, index) => [id, index]))
    dumps = [...dumps].sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999))
  },
  updateDump: async (id, updates) => {
    const existing = dumps.find(dump => dump.id === id)
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
    dumps = dumps.map(dump => dump.id === id ? updatedDump : dump)
    return cloneDump(updatedDump)
  },
  createDump: async (input) => {
    const createdAtIso = new Date().toISOString()
    return {
      id: crypto.randomUUID(),
      created: createdAtIso,
      text: input.text,
      files: [],
      tags: [],
      order: 0
    }
  },
  getDumpsFromVault: async () => dumps.map(dump => ({
    id: dump.id,
    created: new Date(dump.createdAt).toISOString(),
    text: dump.text,
    files: dump.files.map(file => ({
      id: file.id,
      type: file.mimeType.startsWith('image/') ? 'image' : 'file',
      path: file.storedPath,
      name: file.originalName,
      mimeType: file.mimeType,
      size: file.size
    })),
    tags: dump.tags,
    order: 0
  })),
  getWindowBounds: async () => null,
  setWindowBounds: async () => {},
  isMaximized: async () => false,
  onThemeChange: () => () => {},
  getTheme: async () => 'system',
  setTheme: async () => {},
  exportDumps: async () => '/tmp/dumpere-export.zip',
  exportSaveDialog: async (defaultName: string) => `/tmp/${defaultName}`,
  importDialog: async () => null,
  importDumps: async () => 0,
  clipboardWrite: async () => {},
  createTempAttachment: async (input) => `mock/${input.name}`,
  checkSummaryHealth: async () => true,
  generateSummary: async ({ type, projectId }) => {
    const relatedDumps = dumps.filter(dump => projectId === null || dump.projectId === projectId)
    if (relatedDumps.length === 0) {
      return null
    }

    const summary: SummaryEntry = {
      id: crypto.randomUUID(),
      type,
      projectId,
      generatedAt: Date.now(),
      dumpCount: relatedDumps.length,
      content: inferSummaryContent(type, projectId, relatedDumps)
    }

    summaries = [summary, ...summaries].sort((a, b) => b.generatedAt - a.generatedAt)
    return cloneSummary(summary)
  },
  getSummaries: async (filters) => summaries
    .filter(summary => (filters?.type ? summary.type === filters.type : true))
    .filter(summary => (
      typeof filters?.projectId === 'undefined'
        ? true
        : summary.projectId === filters.projectId
    ))
    .map(cloneSummary),
  exportSummary: async (summaryId: string) => {
    const summary = summaries.find(item => item.id === summaryId)
    return summary ? `/tmp/${summary.id}.md` : null
  },
  getSummarySettings: async () => ({ ...summarySettings }),
  updateSummarySettings: async (settings) => {
    summarySettings = { ...settings }
    return { ...summarySettings }
  },
  getWorkspaceTree: async (projectId) => buildWorkspaceTree(projectId),
  createWorkspaceFolder: async (projectId, parentPath, name) => {
    const folderPath = parentPath ? `${parentPath}/${name}` : name
    const workspace = ensureWorkspace(projectId)
    const indexPath = `${folderPath}/index.md`
    if (!workspace.has(indexPath)) {
      workspace.set(indexPath, {
        projectId,
        path: indexPath,
        content: '',
        updatedAt: Date.now()
      })
    }
    return {
      type: 'folder',
      name,
      path: folderPath,
      children: []
    }
  },
  createWorkspaceNote: async (projectId, parentPath, name) => {
    const path = parentPath ? `${parentPath}/${name}` : name
    const notePath = path.endsWith('.md') ? path : `${path}.md`
    const note: WorkspaceNote = {
      projectId,
      path: notePath,
      content: '',
      updatedAt: Date.now()
    }
    ensureWorkspace(projectId).set(notePath, note)
    return cloneWorkspaceNote(note)
  },
  readWorkspaceNote: async (projectId, notePath) => {
    const note = ensureWorkspace(projectId).get(notePath)
    if (!note) {
      throw new Error(`Note not found: ${notePath}`)
    }
    return cloneWorkspaceNote(note)
  },
  updateWorkspaceNote: async (projectId, notePath, content) => {
    const note: WorkspaceNote = {
      projectId,
      path: notePath,
      content,
      updatedAt: Date.now()
    }
    ensureWorkspace(projectId).set(notePath, note)
    return cloneWorkspaceNote(note)
  },
  renameWorkspaceEntry: async (projectId, path, name) => {
    const workspace = ensureWorkspace(projectId)
    const nextPath = renamePath(path, name.endsWith('.md') || !path.endsWith('.md') ? name : `${name}.md`)
    const replacements = new Map<string, WorkspaceNote>()

    for (const [notePath, note] of workspace.entries()) {
      if (notePath === path || notePath.startsWith(`${path}/`)) {
        const updatedPath = notePath === path
          ? nextPath
          : `${nextPath}${notePath.slice(path.length)}`
        replacements.set(updatedPath, { ...note, path: updatedPath, updatedAt: Date.now() })
        workspace.delete(notePath)
      }
    }

    replacements.forEach((note, notePath) => {
      workspace.set(notePath, note)
    })

    return { path: nextPath }
  },
  deleteWorkspaceEntry: async (projectId, path) => {
    const workspace = ensureWorkspace(projectId)
    for (const notePath of Array.from(workspace.keys())) {
      if (notePath === path || notePath.startsWith(`${path}/`)) {
        workspace.delete(notePath)
      }
    }
  },
  getVaultState: async () => ({ ...vaultState }),
  createVault: async () => ({ ...vaultState }),
  openVault: async (vaultPath) => {
    vaultState = {
      isOpen: true,
      vaultPath: vaultPath ?? '/demo/dumpere-vault',
      vaultName: 'Demo Vault'
    }
    recentVaults = [
      { path: vaultState.vaultPath ?? '/demo/dumpere-vault', name: vaultState.vaultName ?? 'Demo Vault', lastOpened: Date.now() },
      ...recentVaults.filter(vault => vault.path !== vaultState.vaultPath)
    ]
    return { ...vaultState }
  },
  closeVault: async () => {
    vaultState = { isOpen: false, vaultPath: null, vaultName: null }
    return { ...vaultState }
  },
  onVaultStateChange: () => {},
  getRecentVaults: async () => [...recentVaults],
  getSummaryPanelState: async () => ({ ...demoSummaryPanelState }),
  setSummaryPanelState: async (state) => {
    Object.keys(demoSummaryPanelState).forEach(key => {
      delete demoSummaryPanelState[key]
    })
    Object.assign(demoSummaryPanelState, state)
  },
  getLastSelectedProjectId: async () => lastSelectedProjectId,
  setLastSelectedProjectId: async (projectId) => {
    lastSelectedProjectId = projectId
  },
  getPanelSizes: async () => ({ ...panelSizes }),
  setPanelSizes: async (sizes) => {
    panelSizes = { ...panelSizes, ...sizes }
  }
}
