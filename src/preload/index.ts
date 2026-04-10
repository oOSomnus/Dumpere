import { contextBridge, ipcRenderer } from 'electron'

interface VaultState {
  isOpen: boolean
  vaultPath: string | null
  vaultName: string | null
}

// Expose a safe API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  copyFiles: (tempPaths: string[]) => {
    return ipcRenderer.invoke('file:copy', tempPaths)
  },

  deleteFile: (storedPath: string) => {
    return ipcRenderer.invoke('file:delete', storedPath)
  },

  openFile: (storedPath: string) => {
    return ipcRenderer.invoke('file:open', storedPath)
  },

  getFileUrl: (storedPath: string) => {
    return ipcRenderer.invoke('file:get-url', storedPath)
  },

  // Store operations (Dump CRUD)
  getDumps: () => {
    return ipcRenderer.invoke('store:get-dumps')
  },

  saveDump: (dump: { text: string; files: Array<{ id: string; originalName: string; storedPath: string; mimeType: string; size: number }>; createdAt: number; updatedAt: number; projectId: string | null; tags: string[] }) => {
    return ipcRenderer.invoke('store:save-dump', dump)
  },

  deleteDump: (id: string) => {
    return ipcRenderer.invoke('store:delete-dump', id)
  },

  // Project operations
  getProjects: () => {
    return ipcRenderer.invoke('store:get-projects')
  },
  saveProject: (project: { id: string; name: string; createdAt: number }) => {
    return ipcRenderer.invoke('store:save-project', project)
  },
  updateProject: (id: string, name: string) => {
    return ipcRenderer.invoke('store:update-project', id, name)
  },
  deleteProject: (id: string) => {
    return ipcRenderer.invoke('store:delete-project', id)
  },

  // Tag operations
  getTags: () => {
    return ipcRenderer.invoke('store:get-tags')
  },
  saveTag: (tag: { id: string; name: string; createdAt: number }) => {
    return ipcRenderer.invoke('store:save-tag', tag)
  },
  deleteTag: (id: string) => {
    return ipcRenderer.invoke('store:delete-tag', id)
  },

  // Dump order operations
  getDumpOrder: () => {
    return ipcRenderer.invoke('store:get-dump-order')
  },
  setDumpOrder: (ids: string[]) => {
    return ipcRenderer.invoke('store:set-dump-order', ids)
  },

  // Dump update operation (for project/tag assignment)
  updateDump: (id: string, updates: { projectId?: string | null; tags?: string[] }) => {
    return ipcRenderer.invoke('store:update-dump', id, updates)
  },

  // Window state
  getWindowBounds: () => {
    return ipcRenderer.invoke('window:get-bounds')
  },

  setWindowBounds: (bounds: { x: number; y: number; width: number; height: number }) => {
    return ipcRenderer.invoke('window:set-bounds', bounds)
  },

  isMaximized: () => {
    return ipcRenderer.invoke('window:is-maximized')
  },

  // Theme change notifications from main process
  onThemeChange: (callback: (isDark: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, isDark: boolean) => callback(isDark)
    ipcRenderer.on('theme:changed', listener)
    return () => {
      ipcRenderer.removeListener('theme:changed', listener)
    }
  },

  // Theme operations
  getTheme: (): Promise<'light' | 'dark' | 'system'> => {
    return ipcRenderer.invoke('theme:get')
  },

  setTheme: (theme: 'light' | 'dark' | 'system'): Promise<void> => {
    return ipcRenderer.invoke('theme:set', theme)
  },

  // Export operations
  exportDumps: (dumpIds: string[], projectName: string) => {
    return ipcRenderer.invoke('export:dumps', dumpIds, projectName)
  },
  exportSaveDialog: (defaultName: string) => {
    return ipcRenderer.invoke('export:save-dialog', defaultName)
  },

  // Import operations
  importDialog: () => {
    return ipcRenderer.invoke('import:dialog')
  },
  importDumps: (zipPath: string, projectId: string) => {
    return ipcRenderer.invoke('import:dumps', zipPath, projectId)
  },

  // Clipboard operations
  clipboardWrite: (text: string) => {
    return ipcRenderer.invoke('clipboard:write', text)
  },

  // Attachment helpers
  createTempAttachment: (input: { name: string; mimeType: string; data: ArrayBuffer }) => {
    return ipcRenderer.invoke('attachment:create-temp', input)
  },

  // AI Summary operations
  checkSummaryHealth: () => {
    return ipcRenderer.invoke('summary:check-health')
  },
  generateSummary: (options: { type: 'daily' | 'weekly'; projectId: string | null }) => {
    return ipcRenderer.invoke('ai:generate-summary', options)
  },
  getSummaries: (filters?: { type?: 'daily' | 'weekly'; projectId?: string | null }) => {
    return ipcRenderer.invoke('ai:get-summaries', filters)
  },
  exportSummary: (summaryId: string) => {
    return ipcRenderer.invoke('ai:export-summary', summaryId)
  },
  getSummarySettings: () => {
    return ipcRenderer.invoke('summary:get-settings')
  },
  updateSummarySettings: (settings: { provider: 'openai' | 'claude'; baseUrl: string; apiKey: string; model: string }) => {
    return ipcRenderer.invoke('summary:update-settings', settings)
  },
  getWorkspaceTree: (projectId: string) => {
    return ipcRenderer.invoke('workspace:get-tree', projectId)
  },
  createWorkspaceFolder: (projectId: string, parentPath: string, name: string) => {
    return ipcRenderer.invoke('workspace:create-folder', projectId, parentPath, name)
  },
  createWorkspaceNote: (projectId: string, parentPath: string, name: string) => {
    return ipcRenderer.invoke('workspace:create-note', projectId, parentPath, name)
  },
  readWorkspaceNote: (projectId: string, notePath: string) => {
    return ipcRenderer.invoke('workspace:read-note', projectId, notePath)
  },
  updateWorkspaceNote: (projectId: string, notePath: string, content: string) => {
    return ipcRenderer.invoke('workspace:update-note', projectId, notePath, content)
  },
  renameWorkspaceEntry: (projectId: string, path: string, name: string) => {
    return ipcRenderer.invoke('workspace:rename-entry', projectId, path, name)
  },
  deleteWorkspaceEntry: (projectId: string, path: string) => {
    return ipcRenderer.invoke('workspace:delete-entry', projectId, path)
  },

  // Vault operations
  getVaultState: () => {
    return ipcRenderer.invoke('vault:get-state')
  },

  createVault: () => {
    return ipcRenderer.invoke('vault:create')
  },

  openVault: (vaultPath?: string) => {
    return ipcRenderer.invoke('vault:open', vaultPath)
  },

  closeVault: () => {
    return ipcRenderer.invoke('vault:close')
  },

  onVaultStateChange: (callback: (state: VaultState) => void) => {
    ipcRenderer.on('vault:state-changed', (_, state) => callback(state))
  },

  // Summary panel state operations
  getSummaryPanelState: () => {
    return ipcRenderer.invoke('summary:get-state')
  },

  setSummaryPanelState: (state: Record<string, { workspaceMode: 'edit' | 'split' | 'preview'; notePath: string }>) => {
    return ipcRenderer.invoke('summary:set-state', state)
  },

  getRecentVaults: () => {
    return ipcRenderer.invoke('vault:get-recent')
  },

  // Dump operations (vault-based, per FILE-01, META-01, META-02)
  createDump: (input: { text: string; filePaths: string[] }) => {
    return ipcRenderer.invoke('dump:create', input)
  },

  getDumpsFromVault: () => {
    return ipcRenderer.invoke('dump:get')
  },
})
