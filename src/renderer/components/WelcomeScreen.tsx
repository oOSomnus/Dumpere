import { useState } from 'react'
import { Folder, Plus, FolderOpen } from 'lucide-react'
import type { VaultState, RecentVault } from '@/shared/types'

interface WelcomeScreenProps {
  vaultState: VaultState
  recentVaults: RecentVault[]
  isLoading: boolean
  error: string | null
  onCreateVault: () => Promise<void>
  onOpenVault: (path?: string) => Promise<void>
}

// Format relative time: "2d ago", "1w ago", etc.
function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)

  if (weeks > 0) return `${weeks}w ago`
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

export function WelcomeScreen({
  recentVaults,
  isLoading,
  error,
  onCreateVault,
  onOpenVault
}: WelcomeScreenProps) {
  const [loadingAction, setLoadingAction] = useState<'create' | 'open' | null>(null)

  const handleCreateVault = async () => {
    setLoadingAction('create')
    try {
      await onCreateVault()
    } catch {
      // Error handled by parent
    } finally {
      setLoadingAction(null)
    }
  }

  const handleOpenVault = async () => {
    setLoadingAction('open')
    try {
      await onOpenVault()
    } catch {
      // Error handled by parent
    } finally {
      setLoadingAction(null)
    }
  }

  const handleRecentVaultClick = async (path: string) => {
    setLoadingAction('open')
    try {
      await onOpenVault(path)
    } catch {
      // Error handled by parent
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        padding: '24px'
      }}
    >
      {/* Welcome card */}
      <div
        className="flex flex-col items-center"
        style={{
          maxWidth: '480px',
          width: '100%',
          gap: '24px'  // space-6
        }}
      >
        {/* App name - Display 28px/600 */}
        <h1
          className="text-[28px] font-semibold"
          style={{
            color: 'var(--foreground)',
            fontWeight: 600,
            lineHeight: 1.2
          }}
        >
          Dumpere
        </h1>

        {/* Tagline - Body 16px/400 muted */}
        <p
          className="text-base"
          style={{
            color: 'var(--muted-foreground)',
            fontWeight: 400,
            lineHeight: 1.5
          }}
        >
          Quick work completion tracking
        </p>

        {/* Button row - gap-4 */}
        <div
          className="flex flex-row gap-4"
        >
          {/* Create Vault - primary filled */}
          <button
            onClick={handleCreateVault}
            disabled={isLoading && loadingAction !== 'create'}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)'
            }}
          >
            {loadingAction === 'create' ? (
              <span>Creating...</span>
            ) : (
              <>
                <Plus size={18} />
                <span>Create Vault</span>
              </>
            )}
          </button>

          {/* Open Vault - outline style */}
          <button
            onClick={handleOpenVault}
            disabled={isLoading && loadingAction !== 'open'}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed border"
            style={{
              backgroundColor: 'var(--secondary)',
              color: 'var(--secondary-foreground)',
              borderColor: 'var(--border)'
            }}
          >
            {loadingAction === 'open' ? (
              <span>Opening...</span>
            ) : (
              <>
                <FolderOpen size={18} />
                <span>Open Vault</span>
              </>
            )}
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div
            className="px-4 py-3 rounded-md text-sm"
            style={{
              backgroundColor: 'var(--destructive)',
              color: 'white',
              width: '100%'
            }}
          >
            {error}
          </div>
        )}

        {/* Recent Vaults section - visible when recentVaults.length > 0 */}
        {recentVaults.length > 0 && (
          <div
            className="flex flex-col gap-2"
            style={{
              width: '100%',
              gap: '8px'  // space-2
            }}
          >
            {/* Heading - Heading 20px/600 */}
            <h2
              className="text-[20px] font-semibold"
              style={{
                color: 'var(--foreground)',
                fontWeight: 600,
                lineHeight: 1.2
              }}
            >
              Recent Vaults
            </h2>

            {/* Recent vault list - flex-col gap-2 */}
            <div
              className="flex flex-col gap-2"
            >
              {recentVaults.map((vault) => (
                <button
                  key={vault.path}
                  onClick={() => handleRecentVaultClick(vault.path)}
                  disabled={isLoading}
                  className="flex items-center justify-between px-3 py-3 rounded-lg text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{
                    backgroundColor: 'var(--secondary)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--accent)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--secondary)'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Folder size={18} style={{ color: 'var(--muted-foreground)' }} />
                    <span
                      className="text-base"
                      style={{
                        color: 'var(--foreground)',
                        fontWeight: 400,
                        lineHeight: 1.5
                      }}
                    >
                      {vault.name}
                    </span>
                  </div>
                  <span
                    className="text-sm"
                    style={{
                      color: 'var(--muted-foreground)',
                      fontWeight: 400
                    }}
                  >
                    {formatRelativeTime(vault.lastOpened)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
