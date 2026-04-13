import { app, clipboard, dialog, ipcMain } from 'electron'
import { store } from '../store'
import { checkSummaryHealth, getDefaultSummarySettings, sanitizeSummarySettings } from '../ai-service'
import type { AppearanceSettings, Locale, PanelSizes, ResolvedLocale, SummaryPanelState, SummarySettings } from '@/shared/types'
import { resolveSystemLocale } from '@/shared/locale'
import { broadcastAppearanceChange, getStoredAppearanceSettings, updateStoredAppearanceSettings } from '../appearance'

export function registerUIIPC(): void {
  ipcMain.handle('ui:appearance:get', (): AppearanceSettings => {
    return getStoredAppearanceSettings()
  })

  ipcMain.handle(
    'ui:appearance:update',
    (_, patch: Partial<AppearanceSettings>): AppearanceSettings => {
      const updated = updateStoredAppearanceSettings(patch)
      broadcastAppearanceChange()
      return updated
    }
  )

  ipcMain.handle('ui:locale:get', (): Locale => {
    return store.get('locale', 'system')
  })

  ipcMain.handle('ui:locale:set', (_, locale: Locale): Locale => {
    store.set('locale', locale)
    return locale
  })

  ipcMain.handle('ui:locale:system', (): ResolvedLocale => {
    return resolveSystemLocale(app.getLocale())
  })

  ipcMain.handle('ui:summary:check-health', async () => {
    const settings = sanitizeSummarySettings(store.get('summarySettings', getDefaultSummarySettings()))
    return checkSummaryHealth(settings)
  })

  ipcMain.handle('ui:summary-settings:get', (): SummarySettings => {
    return sanitizeSummarySettings(store.get('summarySettings', getDefaultSummarySettings()))
  })

  ipcMain.handle('ui:summary-settings:update', (_, settings: SummarySettings): SummarySettings => {
    const sanitized = sanitizeSummarySettings(settings)
    store.set('summarySettings', sanitized)
    return sanitized
  })

  ipcMain.handle('ui:summary-panel-state:get', (): SummaryPanelState => {
    return store.get('summaryPanelState', {})
  })

  ipcMain.handle('ui:summary-panel-state:set', (_, state: SummaryPanelState) => {
    store.set('summaryPanelState', state)
  })

  ipcMain.handle('ui:last-selected-project:get', () => {
    return store.get('lastSelectedProjectId', null)
  })

  ipcMain.handle('ui:last-selected-project:set', (_, projectId: string | null) => {
    store.set('lastSelectedProjectId', projectId)
  })

  ipcMain.handle('ui:panel-sizes:get', (): PanelSizes => {
    return store.get('panelSizes', { sidebarWidth: 240, inputHeight: 60 })
  })

  ipcMain.handle('ui:panel-sizes:set', (_, sizes: Partial<PanelSizes>) => {
    const current = store.get('panelSizes', { sidebarWidth: 240, inputHeight: 60 })
    store.set('panelSizes', { ...current, ...sizes })
  })

  ipcMain.handle('ui:export-save-dialog', async (_, defaultName: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
    })
    return result.canceled ? null : result.filePath
  })

  ipcMain.handle('ui:import-dialog', async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
      properties: ['openFile']
    })
    return result.canceled ? null : result.filePaths[0] ?? null
  })

  ipcMain.handle('ui:copy-to-clipboard', async (_, text: string) => {
    clipboard.writeText(text)
  })
}
