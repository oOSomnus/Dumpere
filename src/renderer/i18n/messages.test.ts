import { describe, expect, it } from 'vitest'
import { messages } from './messages'

describe('i18n messages', () => {
  it('keeps English and Chinese catalogs aligned', () => {
    const enKeys = Object.keys(messages.en).sort()
    const zhKeys = Object.keys(messages['zh-CN']).sort()

    expect(zhKeys).toEqual(enKeys)
  })

  it('exports a complete catalog for useI18n', () => {
    expect(messages.en['settings.title']).toBe('Summary Settings')
    expect(messages['zh-CN']['settings.title']).toBe('总结设置')
    expect(messages.en['summary.generate']).toBe('Generate Summary')
    expect(messages['zh-CN']['summary.generate']).toBe('生成总结')
  })
})
