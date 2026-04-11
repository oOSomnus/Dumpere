import { ipcMain } from 'electron'
import {
  createWorkspaceFolder,
  createWorkspaceNote,
  deleteWorkspaceEntry,
  getWorkspaceTree,
  readWorkspaceNote,
  renameWorkspaceEntry,
  updateWorkspaceNote
} from '../workspace-service'

export function registerWorkspaceIPC(): void {
  ipcMain.handle('workspace:get-tree', (_, projectId: string) => getWorkspaceTree(projectId))
  ipcMain.handle('workspace:create-folder', (_, projectId: string, parentPath: string, name: string) => (
    createWorkspaceFolder(projectId, parentPath, name)
  ))
  ipcMain.handle('workspace:create-note', (_, projectId: string, parentPath: string, name: string) => (
    createWorkspaceNote(projectId, parentPath, name)
  ))
  ipcMain.handle('workspace:read-note', (_, projectId: string, notePath: string) => (
    readWorkspaceNote(projectId, notePath)
  ))
  ipcMain.handle('workspace:update-note', (_, projectId: string, notePath: string, content: string) => (
    updateWorkspaceNote(projectId, notePath, content)
  ))
  ipcMain.handle('workspace:rename-entry', (_, projectId: string, path: string, name: string) => (
    renameWorkspaceEntry(projectId, path, name)
  ))
  ipcMain.handle('workspace:delete-entry', (_, projectId: string, path: string) => (
    deleteWorkspaceEntry(projectId, path)
  ))
}
