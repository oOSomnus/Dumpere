export type AttachmentKind = 'image' | 'video' | 'audio' | 'file'

export interface AttachmentRecord {
  id: string
  originalName: string
  storedPath: string
  mimeType: string
  size: number
  kind: AttachmentKind
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
  color: string
}

export interface DumpRecord {
  id: string
  text: string
  files: AttachmentRecord[]
  createdAt: number
  updatedAt: number
  projectId: string | null
  tags: string[]
}

export type DumpEntry = DumpRecord
export type DumpMetadata = DumpRecord
export type StoredFile = AttachmentRecord
export type VaultFile = AttachmentRecord

export type DatePreset = 'today' | 'week' | 'month'

export interface DateFilterState {
  mode: 'all' | 'preset' | 'dates'
  preset: DatePreset | null
  dates: string[]
}

export interface SummaryEntry {
  id: string
  type: 'daily' | 'weekly'
  projectId: string | null
  generatedAt: number
  content: string
  dumpCount: number
}

export type SummaryProvider = 'openai' | 'claude'

export interface SummarySettings {
  provider: SummaryProvider
  baseUrl: string
  apiKey: string
  model: string
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

export interface PanelSizes {
  sidebarWidth: number
  inputHeight: number
}

export interface SummaryPanelProjectState {
  workspaceMode: 'edit' | 'split' | 'preview'
  notePath: string
}

export type SummaryPanelState = Record<string, SummaryPanelProjectState>

export type ThemeMode = 'light' | 'dark' | 'system'
export type ColorSchemeId = 'default' | 'anuppuccin'
export interface AppearanceSettings {
  mode: ThemeMode
  colorScheme: ColorSchemeId
}

export interface ResolvedAppearance extends AppearanceSettings {
  isDark: boolean
}

export type Locale = 'system' | 'en' | 'zh-CN'
export type ResolvedLocale = 'en' | 'zh-CN'

export interface VaultMetadata {
  version: 2
  createdAt: number
  projects: Project[]
  tags: Tag[]
  dumps: DumpRecord[]
  summaries: SummaryEntry[]
}

export interface CreateDumpInput {
  text: string
  filePaths: string[]
  projectId: string | null
  tagIds: string[]
}

export interface UpdateDumpInput {
  projectId?: string | null
  tags?: string[]
}

export interface DataAPI {
  getDumps: () => Promise<DumpRecord[]>
  createDump: (input: CreateDumpInput) => Promise<DumpRecord>
  updateDump: (id: string, updates: UpdateDumpInput) => Promise<DumpRecord>
  deleteDump: (id: string) => Promise<void>
  getProjects: () => Promise<Project[]>
  createProject: (name: string) => Promise<Project>
  updateProject: (id: string, name: string) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  getTags: () => Promise<Tag[]>
  createTag: (name: string) => Promise<Tag>
  deleteTag: (id: string) => Promise<void>
  generateSummary: (options: { type: 'daily' | 'weekly'; projectId: string | null }) => Promise<SummaryEntry | null>
  getSummaries: (filters?: { type?: 'daily' | 'weekly'; projectId?: string | null }) => Promise<SummaryEntry[]>
  exportSummary: (summaryId: string) => Promise<string | null>
  exportDumps: (dumpIds: string[], projectName: string, outputPath?: string) => Promise<string | null>
  importDumps: (zipPath: string, projectId: string) => Promise<number>
}

export interface WorkspaceAPI {
  getTree: (projectId: string) => Promise<WorkspaceNode[]>
  createFolder: (projectId: string, parentPath: string, name: string) => Promise<WorkspaceNode>
  createNote: (projectId: string, parentPath: string, name: string) => Promise<WorkspaceNote>
  readNote: (projectId: string, notePath: string) => Promise<WorkspaceNote>
  updateNote: (projectId: string, notePath: string, content: string) => Promise<WorkspaceNote>
  renameEntry: (projectId: string, path: string, name: string) => Promise<{ path: string }>
  deleteEntry: (projectId: string, path: string) => Promise<void>
}

export interface VaultAPI {
  getState: () => Promise<VaultState>
  create: () => Promise<VaultState>
  open: (vaultPath?: string) => Promise<VaultState>
  close: () => Promise<VaultState>
  onStateChange: (callback: (state: VaultState) => void) => () => void
  getRecent: () => Promise<RecentVault[]>
}

export interface UIAPI {
  onAppearanceChange: (callback: (appearance: ResolvedAppearance) => void) => () => void
  getAppearance: () => Promise<AppearanceSettings>
  updateAppearance: (patch: Partial<AppearanceSettings>) => Promise<AppearanceSettings>
  getLocale: () => Promise<Locale>
  setLocale: (locale: Locale) => Promise<Locale>
  getSystemLocale: () => Promise<ResolvedLocale>
  checkSummaryHealth: () => Promise<boolean>
  getSummarySettings: () => Promise<SummarySettings>
  updateSummarySettings: (settings: SummarySettings) => Promise<SummarySettings>
  getSummaryPanelState: () => Promise<SummaryPanelState>
  setSummaryPanelState: (state: SummaryPanelState) => Promise<void>
  getLastSelectedProjectId: () => Promise<string | null>
  setLastSelectedProjectId: (projectId: string | null) => Promise<void>
  getPanelSizes: () => Promise<PanelSizes>
  setPanelSizes: (sizes: Partial<PanelSizes>) => Promise<void>
  exportSaveDialog: (defaultName: string) => Promise<string | null>
  importDialog: () => Promise<string | null>
  copyToClipboard: (text: string) => Promise<void>
}

export interface FilesAPI {
  openFile: (storedPath: string) => Promise<void>
  getFileUrl: (storedPath: string) => Promise<string>
  createTempAttachment: (input: { name: string; mimeType: string; data: ArrayBuffer }) => Promise<string>
}

export interface ElectronAPI {
  data: DataAPI
  workspace: WorkspaceAPI
  vault: VaultAPI
  ui: UIAPI
  files: FilesAPI
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
