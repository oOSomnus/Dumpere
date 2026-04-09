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

export type SummaryProvider = 'ollama' | 'openai'

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
  onThemeChange: (callback: (isDark: boolean) => void) => void

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
  getWorkpad: (projectId: string | null) => Promise<ProjectWorkpad>
  updateWorkpad: (projectId: string | null, content: string) => Promise<ProjectWorkpad>
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

// Default mock API for browser testing
export const mockElectronAPI: ElectronAPI = {
  copyFiles: async () => [],
  deleteFile: async () => {},
  getFileUrl: async (path: string) => `file://${path}`,
  getDumps: async () => [],
  saveDump: async (dump) => ({ ...dump, id: crypto.randomUUID() }) as DumpEntry,
  deleteDump: async () => {},
  getProjects: async () => [],
  saveProject: async (project) => project,
  updateProject: async (id, name) => ({ id, name, createdAt: Date.now() }) as Project,
  deleteProject: async () => {},
  getTags: async () => [],
  saveTag: async (tag) => tag,
  deleteTag: async () => {},
  getDumpOrder: async () => [],
  setDumpOrder: async () => {},
  updateDump: async (id, updates) => ({ id, text: '', files: [], createdAt: Date.now(), updatedAt: Date.now(), projectId: null, tags: [], ...updates }) as DumpEntry,
  getWindowBounds: async () => null,
  setWindowBounds: async () => {},
  isMaximized: async () => false,
  onThemeChange: () => {},
  exportDumps: async () => null,
  exportSaveDialog: async () => null,
  importDialog: async () => null,
  importDumps: async () => 0,
  clipboardWrite: async () => {},
  createTempAttachment: async () => '',
  // AI Summary operations
  checkSummaryHealth: async () => true,
  generateSummary: async () => null,
  getSummaries: async () => [],
  exportSummary: async () => null,
  getSummarySettings: async () => ({
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    apiKey: '',
    model: 'mistral',
  }),
  updateSummarySettings: async (settings) => settings,
  getWorkpad: async (projectId) => ({
    projectId,
    content: '',
    updatedAt: 0
  }),
  updateWorkpad: async (projectId, content) => ({
    projectId,
    content,
    updatedAt: Date.now()
  }),
  // Vault dump operations (per FILE-01, META-01, META-02)
  createDump: async (input: { text: string; filePaths: string[] }) => {
    return {
      id: crypto.randomUUID(),
      created: new Date().toISOString(),
      text: input.text,
      files: [],
      tags: [],
      order: 0
    }
  },
  getDumpsFromVault: async () => [],
}
