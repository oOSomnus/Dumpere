import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { ConfirmDialog } from './ConfirmDialog'
import { cn } from '@/shared/cn'

export type PromptNotificationVariant = 'success' | 'error' | 'info'

export interface PromptConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

export interface PromptNotificationOptions {
  title?: string
  message: string
  variant?: PromptNotificationVariant
  duration?: number
}

interface PromptNotification extends PromptNotificationOptions {
  id: string
}

interface PromptContextValue {
  confirm: (options: PromptConfirmOptions) => Promise<boolean>
  notify: (options: PromptNotificationOptions) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
}

interface ConfirmState {
  open: boolean
  options: PromptConfirmOptions
}

const DEFAULT_CONFIRM_OPTIONS: PromptConfirmOptions = {
  title: '',
  destructive: true
}

const PromptContext = createContext<PromptContextValue | null>(null)

function createPromptId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `prompt-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function PromptProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<PromptNotification[]>([])
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    options: DEFAULT_CONFIRM_OPTIONS
  })
  const timeoutsRef = useRef<Record<string, number>>({})
  const confirmResolverRef = useRef<((value: boolean) => void) | null>(null)

  const dismissNotification = useCallback((id: string) => {
    if (timeoutsRef.current[id]) {
      window.clearTimeout(timeoutsRef.current[id])
      delete timeoutsRef.current[id]
    }

    setNotifications(current => current.filter(notification => notification.id !== id))
  }, [])

  const notify = useCallback((options: PromptNotificationOptions) => {
    const id = createPromptId()
    const notification: PromptNotification = {
      id,
      variant: options.variant ?? 'info',
      duration: options.duration ?? 3200,
      title: options.title,
      message: options.message
    }

    setNotifications(current => [...current, notification])
    timeoutsRef.current[id] = window.setTimeout(() => {
      dismissNotification(id)
    }, notification.duration)
  }, [dismissNotification])

  const confirm = useCallback((options: PromptConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve
      setConfirmState({
        open: true,
        options: {
          ...DEFAULT_CONFIRM_OPTIONS,
          ...options
        }
      })
    })
  }, [])

  const closeConfirm = useCallback((confirmed: boolean) => {
    const resolve = confirmResolverRef.current
    confirmResolverRef.current = null
    resolve?.(confirmed)

    setConfirmState({
      open: false,
      options: DEFAULT_CONFIRM_OPTIONS
    })
  }, [])

  useEffect(() => {
    return () => {
      Object.values(timeoutsRef.current).forEach(timeoutId => window.clearTimeout(timeoutId))
    }
  }, [])

  const value = useMemo<PromptContextValue>(() => ({
    confirm,
    notify,
    success: (message: string, title = 'Success') => {
      notify({ title, message, variant: 'success' })
    },
    error: (message: string, title = 'Something went wrong') => {
      notify({ title, message, variant: 'error' })
    },
    info: (message: string, title = 'Notice') => {
      notify({ title, message, variant: 'info' })
    }
  }), [confirm, notify])

  return (
    <PromptContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-full max-w-sm flex-col gap-3">
        {notifications.map(notification => (
          <PromptToast
            key={notification.id}
            notification={notification}
            onDismiss={() => dismissNotification(notification.id)}
          />
        ))}
      </div>

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => {
          if (!open) {
            closeConfirm(false)
          }
        }}
        title={confirmState.options.title}
        description={confirmState.options.description}
        confirmLabel={confirmState.options.confirmLabel}
        cancelLabel={confirmState.options.cancelLabel}
        destructive={confirmState.options.destructive}
        onConfirm={() => closeConfirm(true)}
      />
    </PromptContext.Provider>
  )
}

function PromptToast({
  notification,
  onDismiss
}: {
  notification: PromptNotification
  onDismiss: () => void
}) {
  const icon = notification.variant === 'success'
    ? <CheckCircle2 className="h-5 w-5" />
    : notification.variant === 'error'
      ? <TriangleAlert className="h-5 w-5" />
      : <Info className="h-5 w-5" />

  const accentColor = notification.variant === 'success'
    ? 'var(--primary)'
    : notification.variant === 'error'
      ? 'var(--destructive)'
      : 'var(--accent)'

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-auto overflow-hidden rounded-xl border shadow-xl backdrop-blur',
        'animate-in slide-in-from-top-2 fade-in duration-200'
      )}
      style={{
        backgroundColor: 'var(--background)',
        borderColor: 'var(--border)',
        color: 'var(--foreground)'
      }}
    >
      <div className="flex gap-3 p-4">
        <div className="mt-0.5 shrink-0" style={{ color: accentColor }}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          {notification.title ? (
            <p className="text-sm font-semibold">{notification.title}</p>
          ) : null}
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {notification.message}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md p-1 transition-colors hover:bg-accent"
          style={{ color: 'var(--muted-foreground)' }}
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div
        className="h-1 w-full"
        style={{ backgroundColor: accentColor, opacity: 0.7 }}
      />
    </div>
  )
}

export function usePrompt() {
  const context = useContext(PromptContext)

  if (!context) {
    throw new Error('usePrompt must be used within a PromptProvider')
  }

  return context
}
