import type { ResolvedLocale } from '@/shared/types'
import { appEn, appZhCN } from './messages/app'
import { commonEn, commonZhCN } from './messages/common'
import { dumpEn, dumpZhCN } from './messages/dump'
import { emptyEn, emptyZhCN } from './messages/empty'
import { expandedEn, expandedZhCN } from './messages/expanded'
import { exportImportEn, exportImportZhCN } from './messages/export-import'
import { projectEn, projectZhCN } from './messages/project'
import { promptEn, promptZhCN } from './messages/prompt'
import { settingsEn, settingsZhCN } from './messages/settings'
import { sidebarEn, sidebarZhCN } from './messages/sidebar'
import { summaryEn, summaryZhCN } from './messages/summary'
import { tagsEn, tagsZhCN } from './messages/tags'
import { welcomeEn, welcomeZhCN } from './messages/welcome'
import { workspaceEn, workspaceZhCN } from './messages/workspace'

const en = {
  ...commonEn,
  ...appEn,
  ...welcomeEn,
  ...sidebarEn,
  ...projectEn,
  ...tagsEn,
  ...dumpEn,
  ...summaryEn,
  ...settingsEn,
  ...promptEn,
  ...exportImportEn,
  ...expandedEn,
  ...workspaceEn,
  ...emptyEn
}

type Messages = typeof en

const zhCN: Messages = {
  ...commonZhCN,
  ...appZhCN,
  ...welcomeZhCN,
  ...sidebarZhCN,
  ...projectZhCN,
  ...tagsZhCN,
  ...dumpZhCN,
  ...summaryZhCN,
  ...settingsZhCN,
  ...promptZhCN,
  ...exportImportZhCN,
  ...expandedZhCN,
  ...workspaceZhCN,
  ...emptyZhCN
}

export type TranslationKey = keyof Messages

export const messages: Record<ResolvedLocale, Messages> = {
  en,
  'zh-CN': zhCN
}
