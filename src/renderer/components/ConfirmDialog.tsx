import * as Dialog from '@radix-ui/react-dialog'
import { X, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  destructive?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  destructive = true,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-in fade-in duration-150" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-md rounded-lg p-6 shadow-xl',
            'focus:outline-none'
          )}
          style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              {destructive && (
                <AlertTriangle
                  className="w-5 h-5 mt-0.5 flex-shrink-0"
                  style={{ color: 'var(--destructive)' }}
                />
              )}
              <div className="flex-1">
                <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
                {description && (
                  <Dialog.Description
                    className="text-sm mt-1"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {description}
                  </Dialog.Description>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  className={cn('px-4 py-2 rounded text-sm transition-colors')}
                  style={{
                    backgroundColor: 'var(--secondary)',
                    color: 'var(--foreground)'
                  }}
                >
                  {cancelLabel}
                </button>
              </Dialog.Close>
              <button
                onClick={handleConfirm}
                className={cn('px-4 py-2 rounded text-sm transition-colors')}
                style={{
                  backgroundColor: destructive ? 'var(--destructive)' : 'var(--primary)',
                  color: 'white'
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
