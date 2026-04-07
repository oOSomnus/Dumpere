import { Paperclip, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileChipProps {
  name: string
  onRemove: () => void
}

export function FileChip({ name, onRemove }: FileChipProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-full text-sm',
        'transition-colors duration-150',
        'min-w-0 max-w-[160px]'
      )}
      style={{
        backgroundColor: 'var(--accent)',
        color: 'var(--accent-foreground)',
        height: '24px'
      }}
    >
      <Paperclip className="w-3 h-3 flex-shrink-0" />
      <span className="truncate flex-1">{name}</span>
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-0.5 rounded-full hover:opacity-80 transition-opacity"
        aria-label={`Remove ${name}`}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}
