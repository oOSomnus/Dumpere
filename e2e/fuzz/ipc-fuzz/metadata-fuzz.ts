// e2e/fuzz/ipc-fuzz/metadata-fuzz.ts

import fs from 'fs'
import path from 'path'
import { createTempDir } from '../helpers'
import * as malform from '../generators/malform'
import { corruptMetadata } from '../generators/mutator'
import type { VaultMetadata } from '../../../src/shared/types'

interface FuzzResult {
  test: string
  error?: string
  metadataValid: boolean
}

export async function fuzzMetadata(iterations: number = 10): Promise<FuzzResult[]> {
  const results: FuzzResult[] = []

  for (let i = 0; i < iterations; i++) {
    const vaultDir = createTempDir()
    const dumpereDir = path.join(vaultDir, '.dumpere')
    fs.mkdirSync(dumpereDir)

    try {
      const originalMetadata: VaultMetadata = {
        version: 2,
        createdAt: Date.now(),
        projects: [{ id: 'proj1', name: 'Test Project', createdAt: Date.now() }],
        tags: [{ id: 'tag1', name: 'Test Tag', createdAt: Date.now(), color: '#64748b' }],
        dumps: [{
          id: 'dump1',
          text: 'Test dump',
          files: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          projectId: 'proj1',
          tags: []
        }],
        summaries: [],
      }

      // Write valid metadata first
      fs.writeFileSync(
        path.join(dumpereDir, 'metadata.json'),
        JSON.stringify(originalMetadata)
      )

      // Generate corrupted metadata
      const corruptionType = Math.floor(Math.random() * 6)
      let corruptedMetadata: VaultMetadata

      switch (corruptionType) {
        case 0:
          corruptedMetadata = corruptMetadata(originalMetadata)
          break
        case 1:
          // Write malformed JSON directly
          const malformed = malform.getRandomMalform('malformedJson')
          fs.writeFileSync(path.join(dumpereDir, 'metadata.json'), malformed)
          corruptedMetadata = originalMetadata
          break
        case 2:
          // Oversized metadata
          corruptedMetadata = {
            ...originalMetadata,
            dumps: Array(1000).fill(null).map((_, idx) => ({
              id: `dump-${idx}`,
              text: 'X'.repeat(1000),
              files: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
              projectId: 'proj1',
              tags: [],
            })),
          }
          break
        case 3:
          // Circular reference (JSON.stringify handles this, but we can try)
          corruptedMetadata = originalMetadata
          // @ts-ignore - intentionally corrupt
          corruptedMetadata.dumps[0] = { self: corruptedMetadata.dumps[0] }
          break
        case 4:
          // Invalid version
          corruptedMetadata = { ...originalMetadata, version: 'invalid' as unknown as VaultMetadata['version'] }
          break
        case 5:
          // Null bytes in file
          const nullPadded = JSON.stringify(originalMetadata).replace(/}/, '}\x00\x00\x00')
          fs.writeFileSync(path.join(dumpereDir, 'metadata.json'), nullPadded, 'utf-8')
          corruptedMetadata = originalMetadata
          break
        default:
          corruptedMetadata = originalMetadata
      }

      if (corruptionType !== 1 && corruptionType !== 5) {
        // Write corrupted metadata
        fs.writeFileSync(
          path.join(dumpereDir, 'metadata.json'),
          JSON.stringify(corruptedMetadata)
        )
      }

      // Try to read metadata - this is what the app does on vault open
      let metadataValid = true
      let error: string | undefined

      try {
        // Simulate readMetadata from metadata-service
        const content = fs.readFileSync(path.join(dumpereDir, 'metadata.json'), 'utf-8')
        const parsed = JSON.parse(content)

        // Check if it passes isMetadata validation
        const isValid = parsed.version === 2 &&
          typeof parsed.createdAt === 'number' &&
          Array.isArray(parsed.projects) &&
          Array.isArray(parsed.dumps)

        if (!isValid) {
          metadataValid = false
          error = 'Metadata validation failed'
        }
      } catch (e) {
        metadataValid = false
        error = String(e)
      }

      results.push({
        test: `corruption_type_${corruptionType}`,
        metadataValid,
        error,
      })
    } finally {
      fs.rmSync(vaultDir, { recursive: true, force: true })
    }
  }

  return results
}

export default fuzzMetadata
