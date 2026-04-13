import type { VaultMetadata } from '@/shared/types'
import { readMetadata, writeMetadata } from '../metadata-service'
import { getVaultState } from '../vault-service'

let writeQueue = Promise.resolve()

export function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(operation, operation)
  writeQueue = next.then(() => undefined, () => undefined)
  return next
}

export function requireVaultPath(): string {
  const state = getVaultState()
  if (!state.isOpen || !state.vaultPath) {
    throw new Error('No vault open')
  }

  return state.vaultPath
}

export async function readActiveMetadata(): Promise<VaultMetadata> {
  return readMetadata(requireVaultPath())
}

export function ensureProjectExists(metadata: VaultMetadata, projectId: string | null): void {
  if (!projectId) {
    return
  }

  if (!metadata.projects.some((project) => project.id === projectId)) {
    throw new Error('Project not found')
  }
}

export function normalizeTagIds(metadata: VaultMetadata, tagIds: string[]): string[] {
  const knownTagIds = new Set(metadata.tags.map((tag) => tag.id))
  return [...new Set(tagIds)].filter((tagId) => knownTagIds.has(tagId))
}

export { readMetadata, writeMetadata }
