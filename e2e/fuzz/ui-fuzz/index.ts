// e2e/fuzz/ui-fuzz/index.ts

import { fuzzTextInputs } from './text-fuzz'
import { fuzzFileAttachments } from './file-fuzz'
import { isDirectExecution } from '../is-direct-execution'

export async function runUIFuzz(iterations: number = 10): Promise<void> {
  console.log(`[UI Fuzz] Starting with ${iterations} iterations per target...`)

  console.log('[UI Fuzz] Testing text inputs...')
  const textResults = await fuzzTextInputs(iterations)
  const textCrashes = textResults.filter(r => r.crashed)
  const textErrors = textResults.filter(r => r.error)

  console.log(`[UI Fuzz] Text results: ${textCrashes.length} crashes, ${textErrors.length} errors`)
  if (textErrors.length > 0) {
    console.log('[UI Fuzz] Text errors:')
    textErrors.slice(0, 5).forEach(r => console.log(`  - ${r.input}: ${r.error}`))
  }

  console.log('[UI Fuzz] Testing file attachments...')
  const fileResults = await fuzzFileAttachments(iterations)
  const fileCrashes = fileResults.filter(r => r.crashed)
  const fileErrors = fileResults.filter(r => r.error)

  console.log(`[UI Fuzz] File results: ${fileCrashes.length} crashes, ${fileErrors.length} errors`)
  if (fileErrors.length > 0) {
    console.log('[UI Fuzz] File errors:')
    fileErrors.slice(0, 5).forEach(r => console.log(`  - ${r.filename}: ${r.error}`))
  }

  // Exit with error code if crashes found
  if (textCrashes.length > 0 || fileCrashes.length > 0) {
    console.error('[UI Fuzz] CRASHES DETECTED')
    process.exit(1)
  }

  console.log('[UI Fuzz] Complete - no crashes detected')
}

if (isDirectExecution(import.meta.url)) {
  const iterations = Number.parseInt(process.argv[2] ?? '10', 10)
  void runUIFuzz(Number.isNaN(iterations) ? 10 : iterations)
}
