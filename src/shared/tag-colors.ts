import type { Tag, VaultMetadata } from './types'

export const TAG_COLOR_PALETTE = [
  '#FBCFE8',
  '#FED7AA',
  '#FDE68A',
  '#BBF7D0',
  '#A7F3D0',
  '#BFDBFE',
  '#C7D2FE',
  '#DDD6FE',
  '#F5D0FE',
  '#E5E7EB'
] as const

export function getTagColorForIndex(index: number): string {
  return TAG_COLOR_PALETTE[index % TAG_COLOR_PALETTE.length]
}

export function normalizeHexColor(color: string): string {
  const normalized = color.trim().toUpperCase()
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : getTagColorForIndex(0)
}

function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function getTagFallbackIndex(tag: Partial<Pick<Tag, 'id' | 'name'>> | null | undefined, fallbackIndex: number): number {
  const seed = tag?.id ?? tag?.name
  if (!seed) {
    return fallbackIndex
  }

  return hashString(seed) % TAG_COLOR_PALETTE.length
}

export function resolveTagColor(
  tag: Partial<Pick<Tag, 'id' | 'name' | 'color'>> | null | undefined,
  fallbackIndex = 0
): string {
  if (!tag || typeof tag.color !== 'string') {
    return getTagColorForIndex(getTagFallbackIndex(tag, fallbackIndex))
  }
  return normalizeHexColor(tag.color)
}

export function assignTagColor(existingTags: Tag[]): string {
  return getTagColorForIndex(existingTags.length)
}

export function ensureTagColors(metadata: VaultMetadata): VaultMetadata {
  return {
    ...metadata,
    tags: metadata.tags.map((tag, index) => ({
      ...tag,
      color: typeof tag.color === 'string' ? normalizeHexColor(tag.color) : getTagColorForIndex(index)
    }))
  }
}

export function hexToRgba(hex: string, alpha: number): string {
  const safeHex = normalizeHexColor(hex).slice(1)
  const red = Number.parseInt(safeHex.slice(0, 2), 16)
  const green = Number.parseInt(safeHex.slice(2, 4), 16)
  const blue = Number.parseInt(safeHex.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
