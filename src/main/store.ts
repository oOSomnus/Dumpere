import Store from 'electron-store'
import { DumpEntry, Project, Tag, SummaryEntry, SummarySettings, ProjectWorkpad } from '../renderer/lib/types'

interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

interface RecentVault {
  path: string
  name: string
  lastOpened: number
}

interface StoreSchema {
  dumps: DumpEntry[]
  projects: Project[]
  tags: Tag[]
  summaries: SummaryEntry[]
  summarySettings: SummarySettings
  workpads: ProjectWorkpad[]
  dumpOrder: string[]  // Array of dump IDs in user-defined order
  windowBounds: WindowBounds | null
  windowMaximized: boolean
  recentVaults: RecentVault[]
  currentVault: { path: string; name: string } | null
  theme?: 'light' | 'dark' | 'system'
  summaryPanelState: Record<string, { workspaceMode: 'edit' | 'split' | 'preview'; notePath: string }>
  lastSelectedProjectId: string | null
}

export const store = new Store<StoreSchema>({
  name: 'dumpere-data',
  defaults: {
    dumps: [],
    projects: [],
    tags: [],
    summaries: [],
    summarySettings: {
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4.1-mini'
    },
    workpads: [],
    dumpOrder: [],
    windowBounds: null,
    windowMaximized: false,
    recentVaults: [],
    currentVault: null,
    theme: 'system',
    summaryPanelState: {},
    lastSelectedProjectId: null
  }
})
