import type { Tag } from '@/shared/types'
import { normalizeTagName, areNamesEquivalent } from '@/shared/naming'
import { assignTagColor } from '@/shared/tag-colors'
import { enqueueWrite, readActiveMetadata, readMetadata, requireVaultPath, writeMetadata } from './repository-context'

export async function getTags(): Promise<Tag[]> {
  return (await readActiveMetadata()).tags
}

export async function createTag(name: string): Promise<Tag> {
  const normalizedName = normalizeTagName(name)

  return enqueueWrite(async () => {
    const vaultPath = requireVaultPath()
    const metadata = await readMetadata(vaultPath)
    const existing = metadata.tags.find((tag) => areNamesEquivalent(tag.name, normalizedName))

    if (existing) {
      return { ...existing }
    }

    const createdTag: Tag = {
      id: crypto.randomUUID(),
      name: normalizedName,
      createdAt: Date.now(),
      color: assignTagColor(metadata.tags)
    }

    metadata.tags.unshift(createdTag)
    await writeMetadata(vaultPath, metadata)
    return createdTag
  })
}

export async function deleteTag(id: string): Promise<void> {
  await enqueueWrite(async () => {
    const vaultPath = requireVaultPath()
    const metadata = await readMetadata(vaultPath)

    metadata.tags = metadata.tags.filter((tag) => tag.id !== id)
    metadata.dumps = metadata.dumps.map((dump) => ({
      ...dump,
      tags: dump.tags.filter((tagId) => tagId !== id)
    }))

    await writeMetadata(vaultPath, metadata)
  })
}
