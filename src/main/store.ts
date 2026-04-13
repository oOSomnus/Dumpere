import Store from 'electron-store'
import type {
  AppearanceSettings,
  Locale,
  PanelSizes,
  RecentVault,
  SummaryPanelState,
  SummarySettings,
  ThemeMode,
  WindowBounds
} from '@/shared/types'
import { DEFAULT_APPEARANCE_SETTINGS } from '@/shared/appearance'

interface StoreSchema {
  summarySettings: SummarySettings
  windowBounds: WindowBounds | null
  windowMaximized: boolean
  recentVaults: RecentVault[]
  appearance: AppearanceSettings
  theme?: ThemeMode
  locale: Locale
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
    appearance: DEFAULT_APPEARANCE_SETTINGS,
    locale: 'system',
    summaryPanelState: {},
    lastSelectedProjectId: null,
    panelSizes: {
      sidebarWidth: 240,
      inputHeight: 60
    }
  }
})
