import type { CSSProperties } from 'react'
import type { Tag } from '@/shared/types'
import { hexToRgba, resolveTagColor } from '@/shared/tag-colors'

function isDarkTheme(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}

export function getTagSolidStyle(tag: Pick<Tag, 'id' | 'name' | 'color'>): CSSProperties {
  const color = resolveTagColor(tag)
  return {
    backgroundColor: color,
    color: 'var(--tag-solid-foreground)'
  }
}

export function getTagSoftStyle(tag: Pick<Tag, 'id' | 'name' | 'color'>): CSSProperties {
  const color = resolveTagColor(tag)
  const dark = isDarkTheme()
  return {
    backgroundColor: hexToRgba(color, dark ? 0.28 : 0.2),
    borderColor: hexToRgba(color, dark ? 0.82 : 0.65),
    color: 'var(--foreground)'
  }
}

export function getTagSwatchStyle(tag: Pick<Tag, 'id' | 'name' | 'color'>): CSSProperties {
  const color = resolveTagColor(tag)
  const dark = isDarkTheme()
  return {
    backgroundColor: color,
    boxShadow: `inset 0 0 0 1px ${hexToRgba(color, dark ? 0.95 : 0.85)}`
  }
}
