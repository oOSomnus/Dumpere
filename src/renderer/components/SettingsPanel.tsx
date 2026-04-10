import { useEffect, useState } from 'react'
import * as Select from '@radix-ui/react-select'
import { ArrowLeft, Check, ChevronDown, Save, SlidersHorizontal } from 'lucide-react'
import { SummarySettings } from '../lib/types'
import { cn } from '../../lib/utils'
import { Switch } from '../../components/ui/switch'
import { getElectronAPI } from '../lib/electron-api'

const DEFAULT_SETTINGS: SummarySettings = {
  provider: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4.1-mini'
}

interface SettingsPanelProps {
  isDark: boolean
  themeLoaded: boolean
  onToggleTheme: (checked?: boolean) => Promise<void>
  onBackToDumps?: () => void
}

export function SettingsPanel({
  isDark,
  themeLoaded,
  onToggleTheme,
  onBackToDumps
}: SettingsPanelProps) {
  const api = getElectronAPI()
  const [settings, setSettings] = useState<SummarySettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await api.getSummarySettings()
        setSettings(stored)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not load summary settings'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  const updateField = <K extends keyof SummarySettings>(field: K, value: SummarySettings[K]) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    setError(null)
    setSuccessMessage(null)
  }

  const handleProviderChange = (provider: SummarySettings['provider']) => {
    setSettings(prev => ({
      ...prev,
      provider,
      baseUrl: provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.anthropic.com/v1',
      model: provider === 'openai' ? 'gpt-4.1-mini' : 'claude-3-5-sonnet-latest',
      apiKey: prev.apiKey,
    }))
    setError(null)
    setSuccessMessage(null)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const saved = await api.updateSummarySettings(settings)
      setSettings(saved)
      setSuccessMessage('Summary settings saved.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save summary settings'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>
              Summary Settings
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Configure the AI backend used for daily and weekly summaries.
            </p>
          </div>
        </div>

        {onBackToDumps && (
          <button
            onClick={onBackToDumps}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              'hover:opacity-90'
            )}
            style={{
              backgroundColor: 'var(--secondary)',
              color: 'var(--secondary-foreground)'
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dumps
          </button>
        )}
      </div>

      {error && (
        <div
          className="px-4 py-3 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--destructive)',
            color: 'var(--destructive-foreground)'
          }}
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          className="px-4 py-3 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-foreground)'
          }}
        >
          {successMessage}
        </div>
      )}

      {isLoading ? (
        <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Loading summary settings...
        </div>
      ) : (
        <>
          {/* Summary Settings Card */}
          <div
            className="rounded-2xl border p-6 space-y-5 max-w-2xl"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--card)'
            }}
          >
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Provider
              </label>
              <Select.Root
                value={settings.provider}
                onValueChange={(value) => handleProviderChange(value as SummarySettings['provider'])}
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
                Base URL
              </label>
              <input
                type="url"
                value={settings.baseUrl}
                onChange={(e) => updateField('baseUrl', e.target.value)}
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
                  ? 'Use a full OpenAI-compatible API base URL, usually including /v1.'
                  : 'Anthropic Claude API base URL is usually https://api.anthropic.com/v1.'}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Model
              </label>
              <input
                type="text"
                value={settings.model}
                onChange={(e) => updateField('model', e.target.value)}
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
                API Key
              </label>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => updateField('apiKey', e.target.value)}
                placeholder={settings.provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
                className="w-full rounded-lg px-3 py-2 border text-sm"
                style={{
                  backgroundColor: 'var(--input)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)'
                }}
              />
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Saved locally on this machine and only used for summary generation requests.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Changes apply to the next generated summary.
              </p>
              <button
                onClick={handleSave}
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
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>

          {/* Appearance: Dark Mode */}
          <div
            className="rounded-2xl border p-6 space-y-4"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--card)'
            }}
          >
            <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Appearance
            </h2>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  Dark mode
                </p>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  Switch between light and dark themes
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium" style={{ color: isDark ? 'var(--muted-foreground)' : 'var(--foreground)' }}>
                  {themeLoaded ? 'Off' : ''}
                </span>
                <Switch
                  checked={isDark}
                  onCheckedChange={onToggleTheme}
                  disabled={!themeLoaded}
                />
                <span className="text-xs font-medium" style={{ color: isDark ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                  {themeLoaded ? 'On' : ''}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
