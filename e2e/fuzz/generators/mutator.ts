// e2e/fuzz/generators/mutator.ts
// Data mutation from valid inputs

import type { DumpEntry, Project, Tag, VaultMetadata } from '../../../src/shared/types'

function mutateString(str: string, intensity: number = 0.3): string {
  const mutations: (() => string)[] = [
    () => str + ' appended',
    () => 'prefixed ' + str,
    () => str.slice(0, Math.floor(str.length / 2)),
    () => str.replace(/./g, () => Math.random() < intensity ? 'X' : ''),
    () => str + '\n'.repeat(Math.floor(Math.random() * 10)),
    () => str + '\x00nullbyte',
  ]
  return mutations[Math.floor(Math.random() * mutations.length)]!()
}

export function mutateDump(dump: DumpEntry): DumpEntry {
  const mutation = Math.floor(Math.random() * 4)
  switch (mutation) {
    case 0:
      return { ...dump, text: mutateString(dump.text) }
    case 1:
      return { ...dump, text: mutateString(dump.text, 0.5) }
    case 2:
      return { ...dump, text: ''.padStart(10000, 'A') }
    case 3:
      return {
        ...dump,
        files: [
          ...dump.files,
          {
            id: 'mutated',
            originalName: 'evil.exe',
            storedPath: '../../../etc/passwd',
            mimeType: 'application/octet-stream',
            size: 999,
            kind: 'file',
          },
        ],
      }
    default:
      return dump
  }
}

export function mutateProject(project: Project): Project {
  return { ...project, name: mutateString(project.name) }
}

export function mutateTag(tag: Tag): Tag {
  return { ...tag, name: mutateString(tag.name) }
}

export function corruptMetadata(metadata: VaultMetadata): VaultMetadata {
  const corruptionType = Math.floor(Math.random() * 6)
  switch (corruptionType) {
    case 0: // Truncate dumps array
      return { ...metadata, dumps: metadata.dumps.slice(0, 1) }
    case 1: // Duplicate projects
      return {
        ...metadata,
        projects: [...metadata.projects, ...metadata.projects.map((p) => ({ ...p, id: 'dup-' + p.id }))],
      }
    case 2: // Null out critical fields
      return { ...metadata, dumps: metadata.dumps.map((d) => ({ ...d, projectId: null })) }
    case 3: // Add garbage to dumps
      return {
        ...metadata,
        dumps: [
          ...metadata.dumps,
          {
            id: 'GARBAGE',
            text: 'GARBAGE',
            files: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            projectId: null,
            tags: [],
          },
        ],
      }
    case 4: // Corrupt version
      return { ...metadata, version: 999 as unknown as VaultMetadata['version'] }
    case 5: // Missing required fields
      return { ...metadata, projects: [], tags: undefined as unknown as [] }
    default:
      return metadata
  }
}

export function mutateArbitrary(obj: unknown): unknown {
  if (typeof obj === 'string') return mutateString(obj)
  if (typeof obj === 'number') return obj + 1
  if (Array.isArray(obj)) return obj.map(mutateArbitrary)
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = mutateArbitrary(value)
    }
    return result
  }
  return obj
}
