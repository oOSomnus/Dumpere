interface VaultPlaceholderProps {
  vaultName: string | null
}

export function VaultPlaceholder({ vaultName }: VaultPlaceholderProps) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        minHeight: '300px',
        padding: '16px'
      }}
    >
      {/* Body 16px/400, muted-foreground */}
      <p
        className="text-base"
        style={{
          color: 'var(--muted-foreground)',
          fontWeight: 400,
          lineHeight: 1.5
        }}
      >
        {vaultName ? `Vault opened: ${vaultName}` : 'Vault opened'}
      </p>
    </div>
  )
}