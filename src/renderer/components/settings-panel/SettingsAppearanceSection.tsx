import { Switch } from '@/renderer/components/ui/switch'
import { useI18n } from '@/renderer/i18n'

interface SettingsAppearanceSectionProps {
  isDark: boolean
  themeLoaded: boolean
  onToggleTheme: (checked?: boolean) => Promise<void>
}

export function SettingsAppearanceSection({
  isDark,
  themeLoaded,
  onToggleTheme
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            {t('settings.darkMode')}
          </p>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {t('settings.darkModeHelp')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium" style={{ color: isDark ? 'var(--muted-foreground)' : 'var(--foreground)' }}>
            {themeLoaded ? t('settings.off') : ''}
          </span>
          <Switch
            checked={isDark}
            onCheckedChange={onToggleTheme}
            disabled={!themeLoaded}
          />
          <span className="text-xs font-medium" style={{ color: isDark ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
            {themeLoaded ? t('settings.on') : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
