import { useEffect, useState } from 'react'
import { ArrowLeft, SlidersHorizontal } from 'lucide-react'
import type { Locale, SummarySettings } from '@/shared/types'
import { cn } from '@/shared/cn'
import { getElectronAPI } from '../lib/electron-api'
import { useI18n } from '@/renderer/i18n'
import { SettingsAppearanceSection } from './settings-panel/SettingsAppearanceSection'
import { SettingsLanguageSection } from './settings-panel/SettingsLanguageSection'
import { SettingsSummarySection } from './settings-panel/SettingsSummarySection'

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
  const { locale, setLocale, t } = useI18n()
  const [settings, setSettings] = useState<SummarySettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [selectedLocale, setSelectedLocale] = useState<Locale>(locale)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await api.ui.getSummarySettings()
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

  useEffect(() => {
    setSelectedLocale(locale)
  }, [locale])

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
      const saved = await api.ui.updateSummarySettings(settings)
      setSettings(saved)
      setSuccessMessage(t('settings.saved'))
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
              {t('settings.title')}
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {t('settings.subtitle')}
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
            {t('settings.backToDumps')}
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
          {t('settings.loading')}
        </div>
      ) : (
        <>
          <SettingsLanguageSection
            selectedLocale={selectedLocale}
            onLocaleChange={(nextLocale) => {
              setSelectedLocale(nextLocale)
              void setLocale(nextLocale)
            }}
          />

          <SettingsSummarySection
            settings={settings}
            isSaving={isSaving}
            onProviderChange={handleProviderChange}
            onUpdateField={updateField}
            onSave={handleSave}
          />

          <SettingsAppearanceSection
            isDark={isDark}
            themeLoaded={themeLoaded}
            onToggleTheme={onToggleTheme}
          />
        </>
      )}
    </div>
  )
}
