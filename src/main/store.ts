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
}

export const store = new Store<StoreSchema>({
  name: 'dumpere-data',
  defaults: {
    dumps: [],
    projects: [],
    tags: [],
    summaries: [],
    summarySettings: {
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      apiKey: '',
      model: 'mistral'
    },
    workpads: [],
    dumpOrder: [],
    windowBounds: null,
    windowMaximized: false,
    recentVaults: [],
    currentVault: null,
    theme: 'system'
  }
})
