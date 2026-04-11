import log from 'electron-log'
import { registerDataIPC } from './register-data-ipc'
import { registerFilesIPC } from './register-files-ipc'
import { registerUIIPC } from './register-ui-ipc'
import { registerVaultIPC } from './register-vault-ipc'
import { registerWorkspaceIPC } from './register-workspace-ipc'

export function setupIPCHandlers(): void {
  registerFilesIPC()
  registerDataIPC()
  registerWorkspaceIPC()
  registerVaultIPC()
  registerUIIPC()
  log.info('IPC handlers registered')
}
