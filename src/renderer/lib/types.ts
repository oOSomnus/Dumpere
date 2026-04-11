export interface StoredFile {
  id: string
  originalName: string
  storedPath: string  // Relative to dumps directory (STOR-04)
  mimeType: string
  size: number
}

export interface Project {
  id: string
  name: string
  createdAt: number
}

export interface Tag {
  id: string
  name: string
  createdAt: number
}

export interface DumpEntry {
  id: string
  text: string
  files: StoredFile[]
  createdAt: number  // Unix timestamp
  updatedAt: number  // Unix timestamp
  projectId: string | null  // PROJ-02, PROJ-03 - null means unassigned
  tags: string[]             // TAG-01 - array of Tag IDs
}

export type DatePreset = 'today' | 'week' | 'month'

export interface DateFilterState {
  mode: 'all' | 'preset' | 'dates'
  preset: DatePreset | null
  dates: string[]
}

export interface DumpInput {
  text: string
  filePaths: string[]  // Temp paths from drag-drop before copy
}

export interface SummaryEntry {
  id: string
  type: 'daily' | 'weekly'
  projectId: string | null  // null = all projects
  generatedAt: number        // Unix timestamp
  content: string            // Markdown content
  dumpCount: number         // How many dumps were summarized
}

export type SummaryProvider = 'openai' | 'claude'

export interface SummarySettings {
  provider: SummaryProvider
  baseUrl: string
  apiKey: string
  model: string
}

export interface ProjectWorkpad {
  projectId: string | null
  content: string
  updatedAt: number
}

export interface WorkspaceNode {
  type: 'folder' | 'note'
  name: string
  path: string
  children?: WorkspaceNode[]
}

export interface WorkspaceNote {
  projectId: string
  path: string
  content: string
  updatedAt: number
}

export interface VaultState {
  isOpen: boolean
  vaultPath: string | null
  vaultName: string | null
}

export interface RecentVault {
  path: string
  name: string
  lastOpened: number
}

export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface ElectronAPI {
  // File operations
  copyFiles: (tempPaths: string[]) => Promise<StoredFile[]>
  deleteFile: (storedPath: string) => Promise<void>
  openFile: (storedPath: string) => Promise<void>
  getFileUrl: (storedPath: string) => Promise<string>

  // Store operations
  getDumps: () => Promise<DumpEntry[]>
  saveDump: (dump: Omit<DumpEntry, 'id'>) => Promise<DumpEntry>
  deleteDump: (id: string) => Promise<void>

  // Project operations
  getProjects: () => Promise<Project[]>
  saveProject: (project: Project) => Promise<Project>
  updateProject: (id: string, name: string) => Promise<Project>
  deleteProject: (id: string) => Promise<void>

  // Tag operations
  getTags: () => Promise<Tag[]>
  saveTag: (tag: Tag) => Promise<Tag>
  deleteTag: (id: string) => Promise<void>

  // Dump order operations
  getDumpOrder: () => Promise<string[]>
  setDumpOrder: (ids: string[]) => Promise<void>

  // Dump update operation (for project/tag assignment)
  updateDump: (id: string, updates: { projectId?: string | null; tags?: string[] }) => Promise<DumpEntry>

  // Vault dump operations (per FILE-01, META-01, META-02)
  createDump: (input: { text: string; filePaths: string[] }) => Promise<DumpMetadata | null>
  getDumpsFromVault: () => Promise<DumpMetadata[]>

  // Window state
  getWindowBounds: () => Promise<WindowBounds | null>
  setWindowBounds: (bounds: WindowBounds) => Promise<void>
  isMaximized: () => Promise<boolean>

  // Theme
  onThemeChange: (callback: (isDark: boolean) => void) => () => void
  getTheme: () => Promise<'light' | 'dark' | 'system'>
  setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>

  // Export operations
  exportDumps: (dumpIds: string[], projectName: string, outputPath?: string) => Promise<string | null>
  exportSaveDialog: (defaultName: string) => Promise<string | null>

  // Import operations
  importDialog: () => Promise<string | null>
  importDumps: (zipPath: string, projectId: string) => Promise<number>

  // Clipboard operations
  clipboardWrite: (text: string) => Promise<void>

  // Attachment helpers
  createTempAttachment: (input: { name: string; mimeType: string; data: ArrayBuffer }) => Promise<string>

  // AI Summary operations
  checkSummaryHealth: () => Promise<boolean>
  generateSummary: (options: { type: 'daily' | 'weekly'; projectId: string | null }) => Promise<SummaryEntry | null>
  getSummaries: (filters?: { type?: 'daily' | 'weekly'; projectId?: string | null }) => Promise<SummaryEntry[]>
  exportSummary: (summaryId: string) => Promise<string | null>
  getSummarySettings: () => Promise<SummarySettings>
  updateSummarySettings: (settings: SummarySettings) => Promise<SummarySettings>
  getWorkspaceTree: (projectId: string) => Promise<WorkspaceNode[]>
  createWorkspaceFolder: (projectId: string, parentPath: string, name: string) => Promise<WorkspaceNode>
  createWorkspaceNote: (projectId: string, parentPath: string, name: string) => Promise<WorkspaceNote>
  readWorkspaceNote: (projectId: string, notePath: string) => Promise<WorkspaceNote>
  updateWorkspaceNote: (projectId: string, notePath: string, content: string) => Promise<WorkspaceNote>
  renameWorkspaceEntry: (projectId: string, path: string, name: string) => Promise<{ path: string }>
  deleteWorkspaceEntry: (projectId: string, path: string) => Promise<void>

  // Vault operations
  getVaultState: () => Promise<VaultState>
  createVault: () => Promise<VaultState>
  openVault: (vaultPath?: string) => Promise<VaultState>
  closeVault: () => Promise<VaultState>
  onVaultStateChange: (callback: (state: VaultState) => void) => void
  getRecentVaults: () => Promise<RecentVault[]>

  // Summary panel state operations
  getSummaryPanelState: () => Promise<Record<string, { workspaceMode: 'edit' | 'split' | 'preview'; notePath: string }>>
  setSummaryPanelState: (state: Record<string, { workspaceMode: 'edit' | 'split' | 'preview'; notePath: string }>) => Promise<void>

  // Last selected project operations
  getLastSelectedProjectId: () => Promise<string | null>
  setLastSelectedProjectId: (projectId: string | null) => Promise<void>

  // Panel size operations (for resizable sidebar and input area)
  getPanelSizes: () => Promise<{ sidebarWidth: number; inputHeight: number }>
  setPanelSizes: (sizes: { sidebarWidth?: number; inputHeight?: number }) => Promise<void>
}

// Extend Window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

// Vault metadata types (per META-01 schema)
export interface VaultMetadata {
  version: string
  created: string  // ISO-8601
  dumps: DumpMetadata[]
}

export interface DumpMetadata {
  id: string
  created: string  // ISO-8601
  text: string
  files: VaultFile[]
  tags: string[]
  order: number
}

export interface VaultFile {
  id: string
  type: 'image' | 'video' | 'audio' | 'file'
  path: string  // relative path like "images/uuid.ext"
  name: string  // original filename
  mimeType: string
  size: number
}

export { mockElectronAPI } from './mock-electron-api'
