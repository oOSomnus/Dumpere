import Store from 'electron-store'
import type {
  PanelSizes,
  RecentVault,
  SummaryPanelState,
  SummarySettings,
  ThemeSetting,
  WindowBounds
} from '@/shared/types'

interface StoreSchema {
  summarySettings: SummarySettings
  windowBounds: WindowBounds | null
  windowMaximized: boolean
  recentVaults: RecentVault[]
  theme: ThemeSetting
  summaryPanelState: SummaryPanelState
  lastSelectedProjectId: string | null
  panelSizes: PanelSizes
}

export const store = new Store<StoreSchema>({
  name: 'dumpere-data',
  defaults: {
    summarySettings: {
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4.1-mini'
    },
    windowBounds: null,
    windowMaximized: false,
    recentVaults: [],
    theme: 'system',
    summaryPanelState: {},
    lastSelectedProjectId: null,
    panelSizes: {
      sidebarWidth: 240,
      inputHeight: 60
    }
  }
})
