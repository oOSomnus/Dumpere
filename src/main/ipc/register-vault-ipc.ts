import { BrowserWindow, ipcMain } from 'electron'
import { closeVault, createVault, getVaultState, onVaultStateChange, openVault } from '../vault-service'
import { initializeVaultData } from '../vault-data-repository'
import { store } from '../store'

let isSubscribed = false

export function registerVaultIPC(): void {
  ipcMain.handle('vault:get-state', () => getVaultState())
  ipcMain.handle('vault:create', async () => {
    const state = await createVault()
    if (state.isOpen) {
      await initializeVaultData()
    }
    return state
  })
  ipcMain.handle('vault:open', async (_, vaultPath?: string) => {
    const state = await openVault(vaultPath)
    if (state.isOpen) {
      await initializeVaultData()
    }
    return state
  })
  ipcMain.handle('vault:close', () => closeVault())
  ipcMain.handle('vault:get-recent', () => store.get('recentVaults', []))

  if (!isSubscribed) {
    onVaultStateChange((state) => {
      BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send('vault:state-changed', state)
      })
    })
    isSubscribed = true
  }
}
