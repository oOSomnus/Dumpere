import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown, Save } from 'lucide-react'
import { cn } from '@/shared/cn'
import type { SummarySettings } from '@/shared/types'
import { useI18n } from '@/renderer/i18n'

interface SettingsSummarySectionProps {
  settings: SummarySettings
  isSaving: boolean
  onProviderChange: (provider: SummarySettings['provider']) => void
  onUpdateField: <K extends keyof SummarySettings>(field: K, value: SummarySettings[K]) => void
  onSave: () => void
}

export function SettingsSummarySection({
  settings,
  isSaving,
  onProviderChange,
  onUpdateField,
  onSave
}: SettingsSummarySectionProps) {
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
          {t('settings.provider')}
        </label>
        <Select.Root
          value={settings.provider}
          onValueChange={(value) => onProviderChange(value as SummarySettings['provider'])}
        >
          <Select.Trigger
            className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm"
            style={{
              backgroundColor: 'var(--input)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)'
            }}
            aria-label="Provider"
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
                <Select.Item
                  value="openai"
                  className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm outline-none"
                  style={{ color: 'var(--foreground)' }}
                >
                  <Select.ItemText>OpenAI</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check className="h-4 w-4" />
                  </Select.ItemIndicator>
                </Select.Item>
                <Select.Item
                  value="claude"
                  className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm outline-none"
                  style={{ color: 'var(--foreground)' }}
                >
                  <Select.ItemText>Claude</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check className="h-4 w-4" />
                  </Select.ItemIndicator>
                </Select.Item>
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          {t('settings.baseUrl')}
        </label>
        <input
          type="url"
          value={settings.baseUrl}
          onChange={(e) => onUpdateField('baseUrl', e.target.value)}
          placeholder={settings.provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.anthropic.com/v1'}
          className="w-full rounded-lg px-3 py-2 border text-sm"
          style={{
            backgroundColor: 'var(--input)',
            borderColor: 'var(--border)',
            color: 'var(--foreground)'
          }}
        />
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {settings.provider === 'openai'
            ? t('settings.openaiBaseUrlHelp')
            : t('settings.claudeBaseUrlHelp')}
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          {t('settings.model')}
        </label>
        <input
          type="text"
          value={settings.model}
          onChange={(e) => onUpdateField('model', e.target.value)}
          placeholder={settings.provider === 'openai' ? 'gpt-4.1-mini' : 'claude-3-5-sonnet-latest'}
          className="w-full rounded-lg px-3 py-2 border text-sm"
          style={{
            backgroundColor: 'var(--input)',
            borderColor: 'var(--border)',
            color: 'var(--foreground)'
          }}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          {t('settings.apiKey')}
        </label>
        <input
          type="password"
          value={settings.apiKey}
          onChange={(e) => onUpdateField('apiKey', e.target.value)}
          placeholder={settings.provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
          className="w-full rounded-lg px-3 py-2 border text-sm"
          style={{
            backgroundColor: 'var(--input)',
            borderColor: 'var(--border)',
            color: 'var(--foreground)'
          }}
        />
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {t('settings.apiKeyHelp')}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {t('settings.nextSummaryHelp')}
        </p>
        <button
          onClick={onSave}
          disabled={isSaving}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          style={{
            backgroundColor: 'var(--primary)',
            color: 'var(--primary-foreground)'
          }}
        >
          <Save className="w-4 h-4" />
          {isSaving ? t('common.saving') : t('settings.save')}
        </button>
      </div>
    </div>
  )
}
