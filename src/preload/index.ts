import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI, Locale, SummaryPanelState, SummarySettings, ThemeSetting } from '@/shared/types'

const electronAPI: ElectronAPI = {
  data: {
    getDumps: () => ipcRenderer.invoke('data:get-dumps'),
    createDump: (input) => ipcRenderer.invoke('data:create-dump', input),
    updateDump: (id, updates) => ipcRenderer.invoke('data:update-dump', id, updates),
    deleteDump: (id) => ipcRenderer.invoke('data:delete-dump', id),
    getProjects: () => ipcRenderer.invoke('data:get-projects'),
    createProject: (name) => ipcRenderer.invoke('data:create-project', name),
    updateProject: (id, name) => ipcRenderer.invoke('data:update-project', id, name),
    deleteProject: (id) => ipcRenderer.invoke('data:delete-project', id),
    getTags: () => ipcRenderer.invoke('data:get-tags'),
    createTag: (name) => ipcRenderer.invoke('data:create-tag', name),
    deleteTag: (id) => ipcRenderer.invoke('data:delete-tag', id),
    generateSummary: (options) => ipcRenderer.invoke('data:generate-summary', options),
    getSummaries: (filters) => ipcRenderer.invoke('data:get-summaries', filters),
    exportSummary: (summaryId) => ipcRenderer.invoke('data:export-summary', summaryId),
    exportDumps: (dumpIds, projectName, outputPath) => ipcRenderer.invoke('data:export-dumps', dumpIds, projectName, outputPath),
    importDumps: (zipPath, projectId) => ipcRenderer.invoke('data:import-dumps', zipPath, projectId)
  },
  workspace: {
    getTree: (projectId) => ipcRenderer.invoke('workspace:get-tree', projectId),
    createFolder: (projectId, parentPath, name) => ipcRenderer.invoke('workspace:create-folder', projectId, parentPath, name),
    createNote: (projectId, parentPath, name) => ipcRenderer.invoke('workspace:create-note', projectId, parentPath, name),
    readNote: (projectId, notePath) => ipcRenderer.invoke('workspace:read-note', projectId, notePath),
    updateNote: (projectId, notePath, content) => ipcRenderer.invoke('workspace:update-note', projectId, notePath, content),
    renameEntry: (projectId, path, name) => ipcRenderer.invoke('workspace:rename-entry', projectId, path, name),
    deleteEntry: (projectId, path) => ipcRenderer.invoke('workspace:delete-entry', projectId, path)
  },
  vault: {
    getState: () => ipcRenderer.invoke('vault:get-state'),
    create: () => ipcRenderer.invoke('vault:create'),
    open: (vaultPath) => ipcRenderer.invoke('vault:open', vaultPath),
    close: () => ipcRenderer.invoke('vault:close'),
    onStateChange: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, state: Awaited<ReturnType<ElectronAPI['vault']['getState']>>) => callback(state)
      ipcRenderer.on('vault:state-changed', listener)
      return () => {
        ipcRenderer.removeListener('vault:state-changed', listener)
      }
    },
    getRecent: () => ipcRenderer.invoke('vault:get-recent')
  },
  ui: {
    onThemeChange: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, isDark: boolean) => callback(isDark)
      ipcRenderer.on('theme:changed', listener)
      return () => {
        ipcRenderer.removeListener('theme:changed', listener)
      }
    },
    getTheme: (): Promise<ThemeSetting> => ipcRenderer.invoke('ui:theme:get'),
    setTheme: (theme) => ipcRenderer.invoke('ui:theme:set', theme),
    getLocale: (): Promise<Locale> => ipcRenderer.invoke('ui:locale:get'),
    setLocale: (locale) => ipcRenderer.invoke('ui:locale:set', locale),
    getSystemLocale: () => ipcRenderer.invoke('ui:locale:system'),
    checkSummaryHealth: () => ipcRenderer.invoke('ui:summary:check-health'),
    getSummarySettings: (): Promise<SummarySettings> => ipcRenderer.invoke('ui:summary-settings:get'),
    updateSummarySettings: (settings) => ipcRenderer.invoke('ui:summary-settings:update', settings),
    getSummaryPanelState: (): Promise<SummaryPanelState> => ipcRenderer.invoke('ui:summary-panel-state:get'),
    setSummaryPanelState: (state) => ipcRenderer.invoke('ui:summary-panel-state:set', state),
    getLastSelectedProjectId: () => ipcRenderer.invoke('ui:last-selected-project:get'),
    setLastSelectedProjectId: (projectId) => ipcRenderer.invoke('ui:last-selected-project:set', projectId),
    getPanelSizes: () => ipcRenderer.invoke('ui:panel-sizes:get'),
    setPanelSizes: (sizes) => ipcRenderer.invoke('ui:panel-sizes:set', sizes),
    exportSaveDialog: (defaultName) => ipcRenderer.invoke('ui:export-save-dialog', defaultName),
    importDialog: () => ipcRenderer.invoke('ui:import-dialog'),
    copyToClipboard: (text) => ipcRenderer.invoke('ui:copy-to-clipboard', text)
  },
  files: {
    openFile: (storedPath) => ipcRenderer.invoke('files:open', storedPath),
    getFileUrl: (storedPath) => ipcRenderer.invoke('files:get-url', storedPath),
    createTempAttachment: (input) => ipcRenderer.invoke('files:create-temp', input)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
