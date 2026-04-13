const MAX_PROJECT_NAME_LENGTH = 50
const MAX_TAG_NAME_LENGTH = 30
const INVALID_FILENAME_CHARS_REGEX = /[<>:"/\\|?*]+/g
const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/g
const WHITESPACE_REGEX = /\s+/g

function containsControlCharacters(value: string): boolean {
  return CONTROL_CHAR_REGEX.test(value)
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(WHITESPACE_REGEX, ' ')
}

export function getProjectNameMaxLength(): number {
  return MAX_PROJECT_NAME_LENGTH
}

export function getTagNameMaxLength(): number {
  return MAX_TAG_NAME_LENGTH
}

export function validateProjectName(name: string): string {
  const trimmed = name.trim()

  if (!trimmed) {
    throw new Error('Project name is required')
  }

  if (trimmed.length > MAX_PROJECT_NAME_LENGTH) {
    throw new Error(`Project name must be ${MAX_PROJECT_NAME_LENGTH} characters or less`)
  }

  if (containsControlCharacters(trimmed)) {
    throw new Error('Project name cannot contain control characters')
  }

  return trimmed
}

export function normalizeTagName(name: string): string {
  const normalized = normalizeWhitespace(name)

  if (!normalized) {
    throw new Error('Tag name is required')
  }

  if (normalized.length > MAX_TAG_NAME_LENGTH) {
    throw new Error(`Tag name must be ${MAX_TAG_NAME_LENGTH} characters or less`)
  }

  if (containsControlCharacters(normalized)) {
    throw new Error('Tag name cannot contain control characters')
  }

  return normalized
}

export function areNamesEquivalent(left: string, right: string): boolean {
  return left.localeCompare(right, undefined, { sensitivity: 'base' }) === 0
}

export function validateWorkspaceEntryName(name: string, type: 'folder' | 'note'): string {
  const trimmed = name.trim()

  if (!trimmed) {
    throw new Error(`${type === 'folder' ? 'Folder' : 'Note'} name is required`)
  }

  if (trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error('Names cannot contain path separators')
  }

  if (containsControlCharacters(trimmed)) {
    throw new Error('Names cannot contain control characters')
  }

  const sanitized = trimmed
    .replace(INVALID_FILENAME_CHARS_REGEX, '-')
    .trim()
    .replace(/[.\s]+$/g, '')

  if (!sanitized || sanitized === '.' || sanitized === '..') {
    throw new Error('Invalid name')
  }

  if (type === 'note') {
    return sanitized.toLowerCase().endsWith('.md') ? sanitized : `${sanitized}.md`
  }

  return sanitized
}

export function sanitizeFilenameForExport(name: string, fallback: 'project' | 'summary'): string {
  const sanitized = name
    .replace(CONTROL_CHAR_REGEX, '')
    .replace(INVALID_FILENAME_CHARS_REGEX, '-')
    .trim()
    .replace(/[.\s]+$/g, '')

  return sanitized || fallback
}
