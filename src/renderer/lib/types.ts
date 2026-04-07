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
  getFileUrl: (storedPath: string) => string

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

  // AI Summary operations
  checkOllamaHealth: () => Promise<boolean>
  generateSummary: (options: { type: 'daily' | 'weekly'; projectId: string | null }) => Promise<SummaryEntry | null>
  getSummaries: (filters?: { type?: 'daily' | 'weekly'; projectId?: string | null }) => Promise<SummaryEntry[]>
  exportSummary: (summaryId: string) => Promise<string | null>
}

// Extend Window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

// Default mock API for browser testing
export const mockElectronAPI: ElectronAPI = {
  copyFiles: async () => [],
  deleteFile: async () => {},
  getFileUrl: (path: string) => `file://${path}`,
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
  // AI Summary operations
  checkOllamaHealth: async () => true,
  generateSummary: async () => null,
  getSummaries: async () => [],
  exportSummary: async () => null,
}
