import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import type { Locale } from '@/shared/types'
import { useI18n } from '@/renderer/i18n'

interface SettingsLanguageSectionProps {
  selectedLocale: Locale
  onLocaleChange: (locale: Locale) => void
}

export function SettingsLanguageSection({
  selectedLocale,
  onLocaleChange
}: SettingsLanguageSectionProps) {
  const { t } = useI18n()

  return (
    <div
      className="rounded-2xl border p-6 space-y-5 max-w-2xl"
      style={{
        borderColor: 'var(--border)',
        backgroundColor: 'var(--card)'
      }}
    >
      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          {t('settings.language')}
        </label>
        <Select.Root
          value={selectedLocale}
          onValueChange={(value) => onLocaleChange(value as Locale)}
        >
          <Select.Trigger
            className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm"
            style={{
              backgroundColor: 'var(--input)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)'
            }}
            aria-label={t('settings.language')}
          >
            <Select.Value />
            <Select.Icon>
              <ChevronDown className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              className="z-50 overflow-hidden rounded-lg border shadow-lg"
              style={{
                backgroundColor: 'var(--popover)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
              position="popper"
              sideOffset={6}
            >
              <Select.Viewport className="p-1">
                <Select.Item value="system" className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm outline-none">
                  <Select.ItemText>{t('settings.languageSystem')}</Select.ItemText>
                  <Select.ItemIndicator><Check className="h-4 w-4" /></Select.ItemIndicator>
                </Select.Item>
                <Select.Item value="en" className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm outline-none">
                  <Select.ItemText>{t('settings.languageEnglish')}</Select.ItemText>
                  <Select.ItemIndicator><Check className="h-4 w-4" /></Select.ItemIndicator>
                </Select.Item>
                <Select.Item value="zh-CN" className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm outline-none">
                  <Select.ItemText>{t('settings.languageChinese')}</Select.ItemText>
                  <Select.ItemIndicator><Check className="h-4 w-4" /></Select.ItemIndicator>
                </Select.Item>
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>
    </div>
  )
}
