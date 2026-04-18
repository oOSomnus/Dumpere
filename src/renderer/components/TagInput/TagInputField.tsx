import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import type { Tag } from '@/shared/types'
import { useI18n } from '@/renderer/i18n'

export interface TagInputFieldProps {
  filterText: string
  highlightedTag: Tag | null
  onFilterTextChange: (value: string) => void
  onHighlightedIndexChange: (index: number) => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  open: boolean
}

export function TagInputField({
  filterText,
  highlightedTag,
  onFilterTextChange,
  onHighlightedIndexChange,
  onKeyDown,
  inputRef,
  open,
}: TagInputFieldProps) {
  const { t } = useI18n()

  // Focus input when popup opens
  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, inputRef])

  return (
    <input
      ref={inputRef}
      type="text"
      value={filterText}
      onChange={e => {
        onFilterTextChange(e.target.value)
        onHighlightedIndexChange(0)
      }}
      onKeyDown={onKeyDown}
      placeholder={t('tags.searchOrCreate')}
      aria-controls="tag-input-options"
      aria-activedescendant={highlightedTag ? `tag-option-${highlightedTag.id}` : undefined}
      className="w-full bg-transparent border-none outline-none text-sm"
      style={{
        color: filterText ? 'var(--foreground)' : 'var(--muted-foreground)',
      }}
    />
  )
}
