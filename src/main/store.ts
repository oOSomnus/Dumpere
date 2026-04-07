import Store from 'electron-store'
import { DumpEntry, Project, Tag, SummaryEntry } from '../renderer/lib/types'

interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

interface StoreSchema {
  dumps: DumpEntry[]
  projects: Project[]
  tags: Tag[]
  summaries: SummaryEntry[]
  dumpOrder: string[]  // Array of dump IDs in user-defined order
  windowBounds: WindowBounds | null
  windowMaximized: boolean
}

export const store = new Store<StoreSchema>({
  name: 'dumpit-data',
  defaults: {
    dumps: [],
    projects: [],
    tags: [],
    summaries: [],
    dumpOrder: [],
    windowBounds: null,
    windowMaximized: false
  }
})
