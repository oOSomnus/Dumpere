// e2e/fuzz/ipc-fuzz/index.ts

import { fuzzMetadata } from './metadata-fuzz'
import { fuzzDumpOperations } from './dump-fuzz'

export async function runIPCFuzz(iterations: number = 10): Promise<void> {
  console.log(`[IPC Fuzz] Starting with ${iterations} iterations per target...`)

  console.log('[IPC Fuzz] Testing metadata corruption...')
  const metadataResults = await fuzzMetadata(iterations)
  const metadataErrors = metadataResults.filter(r => !r.metadataValid)
  console.log(`[IPC Fuzz] Metadata results: ${metadataErrors.length} corruptions detected out of ${metadataResults.length}`)
  if (metadataErrors.length > 0) {
    console.log('[IPC Fuzz] Sample errors:')
    metadataErrors.slice(0, 5).forEach(r => console.log(`  - ${r.test}: ${r.error}`))
  }

  console.log('[IPC Fuzz] Testing dump operations...')
  const dumpResults = await fuzzDumpOperations(iterations)
  const dumpCrashes = dumpResults.filter(r => !r.success && r.test === 'crash')
  const dumpErrors = dumpResults.filter(r => !r.success && r.test !== 'crash')
  console.log(`[IPC Fuzz] Dump results: ${dumpCrashes.length} crashes, ${dumpErrors.length} errors`)
  if (dumpErrors.length > 0) {
    console.log('[IPC Fuzz] Sample errors:')
    dumpErrors.slice(0, 5).forEach(r => console.log(`  - ${r.test}: ${r.error}`))
  }

  // Exit with error code if crashes found
  if (dumpCrashes.length > 0) {
    console.error('[IPC Fuzz] CRASHES DETECTED')
    process.exit(1)
  }

  console.log('[IPC Fuzz] Complete - no crashes detected')
}

// Allow direct execution
runIPCFuzz(parseInt(process.argv[2] ?? '10', 10))