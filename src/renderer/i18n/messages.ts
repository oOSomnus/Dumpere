import type { ResolvedLocale } from '@/shared/types'
import en from './locales/en.json'
import zhCN from './locales/zh-CN.json'

export type TranslationKey = keyof typeof en

export const messages: Record<ResolvedLocale, typeof en> = {
  en,
  'zh-CN': zhCN
}
