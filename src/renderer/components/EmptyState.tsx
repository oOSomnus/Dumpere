import { useI18n } from '@/renderer/i18n'

export function EmptyState() {
  const { t } = useI18n()
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ minHeight: '300px' }}
    >
      {/* Display heading */}
      <h2
        className="text-[28px] font-semibold mb-2"
        style={{
          color: 'var(--foreground)',
          fontWeight: 600,
          lineHeight: 1.1
        }}
      >
        {t('empty.noDumps')}
      </h2>

      {/* Body text */}
      <p
        className="text-base"
        style={{
          color: 'var(--muted-foreground)',
          fontWeight: 400,
          lineHeight: 1.5
        }}
      >
        {t('empty.startTyping')}
      </p>
    </div>
  )
}
