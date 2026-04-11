import { readFile, rename, writeFile } from 'fs/promises'
import { join } from 'path'
import type { DumpEntry, Project, SummaryEntry, Tag, VaultMetadata } from '@/shared/types'

function isProject(value: unknown): value is Project {
  return typeof value === 'object' &&
    value !== null &&
    typeof (value as Project).id === 'string' &&
    typeof (value as Project).name === 'string' &&
    typeof (value as Project).createdAt === 'number'
}

function isTag(value: unknown): value is Tag {
  return typeof value === 'object' &&
    value !== null &&
    typeof (value as Tag).id === 'string' &&
    typeof (value as Tag).name === 'string' &&
    typeof (value as Tag).createdAt === 'number'
}

function isDump(value: unknown): value is DumpEntry {
  return typeof value === 'object' &&
    value !== null &&
    typeof (value as DumpEntry).id === 'string' &&
    typeof (value as DumpEntry).text === 'string' &&
    Array.isArray((value as DumpEntry).files) &&
    typeof (value as DumpEntry).createdAt === 'number' &&
    typeof (value as DumpEntry).updatedAt === 'number' &&
    (typeof (value as DumpEntry).projectId === 'string' || (value as DumpEntry).projectId === null) &&
    Array.isArray((value as DumpEntry).tags)
}

function isSummary(value: unknown): value is SummaryEntry {
  return typeof value === 'object' &&
    value !== null &&
    typeof (value as SummaryEntry).id === 'string' &&
    ((value as SummaryEntry).type === 'daily' || (value as SummaryEntry).type === 'weekly') &&
    (typeof (value as SummaryEntry).projectId === 'string' || (value as SummaryEntry).projectId === null) &&
    typeof (value as SummaryEntry).generatedAt === 'number' &&
    typeof (value as SummaryEntry).content === 'string' &&
    typeof (value as SummaryEntry).dumpCount === 'number'
}

function isMetadata(value: unknown): value is VaultMetadata {
  return typeof value === 'object' &&
    value !== null &&
    (value as VaultMetadata).version === 2 &&
    typeof (value as VaultMetadata).createdAt === 'number' &&
    Array.isArray((value as VaultMetadata).projects) &&
    Array.isArray((value as VaultMetadata).tags) &&
    Array.isArray((value as VaultMetadata).dumps) &&
    Array.isArray((value as VaultMetadata).summaries) &&
    (value as VaultMetadata).projects.every(isProject) &&
    (value as VaultMetadata).tags.every(isTag) &&
    (value as VaultMetadata).dumps.every(isDump) &&
    (value as VaultMetadata).summaries.every(isSummary)
}

export function createEmptyMetadata(): VaultMetadata {
  return {
    version: 2,
    createdAt: Date.now(),
    projects: [],
    tags: [],
    dumps: [],
    summaries: []
  }
}

export function getMetadataPath(vaultPath: string): string {
  return join(vaultPath, '.dumpere', 'metadata.json')
}

export async function readMetadata(vaultPath: string): Promise<VaultMetadata> {
  const content = await readFile(getMetadataPath(vaultPath), 'utf8')
  const parsed = JSON.parse(content) as unknown

  if (!isMetadata(parsed)) {
    throw new Error('Vault metadata is corrupted or uses an unsupported version')
  }

  return parsed
}

export async function writeMetadata(vaultPath: string, metadata: VaultMetadata): Promise<void> {
  const metadataPath = getMetadataPath(vaultPath)
  const tempPath = `${metadataPath}.tmp`
  await writeFile(tempPath, JSON.stringify(metadata, null, 2), 'utf8')
  await rename(tempPath, metadataPath)
}
