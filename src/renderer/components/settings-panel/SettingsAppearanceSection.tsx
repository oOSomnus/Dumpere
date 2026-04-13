import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import type { AppearanceSettings, ColorSchemeId, ThemeMode } from '@/shared/types'
import { useI18n } from '@/renderer/i18n'

interface SettingsAppearanceSectionProps {
  appearance: AppearanceSettings
  isLoaded: boolean
  onModeChange: (mode: ThemeMode) => Promise<void>
  onColorSchemeChange: (colorScheme: ColorSchemeId) => Promise<void>
}

export function SettingsAppearanceSection({
  appearance,
  isLoaded,
  onModeChange,
  onColorSchemeChange
}: SettingsAppearanceSectionProps) {
  const { t } = useI18n()

  return (
    <div
      className="rounded-2xl border p-6 space-y-4"
      style={{
        borderColor: 'var(--border)',
        backgroundColor: 'var(--card)'
      }}
    >
      <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
        {t('settings.appearance')}
      </h2>

      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          {t('settings.themeMode')}
        </label>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {t('settings.themeModeHelp')}
        </p>
        <Select.Root
          value={appearance.mode}
          onValueChange={(value) => void onModeChange(value as ThemeMode)}
          disabled={!isLoaded}
        >
          <Select.Trigger
            className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm"
            style={{
              backgroundColor: 'var(--input)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)'
            }}
            aria-label={t('settings.themeMode')}
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
                  <Select.ItemText>{t('settings.themeModeSystem')}</Select.ItemText>
                  <Select.ItemIndicator><Check className="h-4 w-4" /></Select.ItemIndicator>
                </Select.Item>
                <Select.Item value="light" className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm outline-none">
                  <Select.ItemText>{t('settings.themeModeLight')}</Select.ItemText>
                  <Select.ItemIndicator><Check className="h-4 w-4" /></Select.ItemIndicator>
                </Select.Item>
                <Select.Item value="dark" className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm outline-none">
                  <Select.ItemText>{t('settings.themeModeDark')}</Select.ItemText>
                  <Select.ItemIndicator><Check className="h-4 w-4" /></Select.ItemIndicator>
                </Select.Item>
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          {t('settings.colorScheme')}
        </label>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {t('settings.colorSchemeHelp')}
        </p>
        <Select.Root
          value={appearance.colorScheme}
          onValueChange={(value) => void onColorSchemeChange(value as ColorSchemeId)}
          disabled={!isLoaded}
        >
          <Select.Trigger
            className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm"
            style={{
              backgroundColor: 'var(--input)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)'
            }}
            aria-label={t('settings.colorScheme')}
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
                <Select.Item value="default" className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm outline-none">
                  <Select.ItemText>{t('settings.colorSchemeDefault')}</Select.ItemText>
                  <Select.ItemIndicator><Check className="h-4 w-4" /></Select.ItemIndicator>
                </Select.Item>
                <Select.Item value="anuppuccin" className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm outline-none">
                  <Select.ItemText>{t('settings.colorSchemeAnuppuccin')}</Select.ItemText>
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
