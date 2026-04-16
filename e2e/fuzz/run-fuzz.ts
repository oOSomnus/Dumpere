// e2e/fuzz/run-fuzz.ts

import { runUIFuzz } from './ui-fuzz'
import { fuzzMetadata, fuzzDumpOperations } from './ipc-fuzz'

const isQuick = process.argv.includes('--quick')
const isUI = process.argv.includes('--ui')
const isIPC = process.argv.includes('--ipc')

const iterations = isQuick ? 10 : 100

async function main() {
  console.log('=== Dumpere Fuzz Testing ===')
  console.log(`Mode: ${isQuick ? 'quick' : 'full'} (${iterations} iterations)`)
  console.log(`Targets: ${isUI ? 'ui' : isIPC ? 'ipc' : 'all'}`)
  console.log('')

  let exitCode = 0

  try {
    if (!isIPC) {
      console.log('[Runner] Starting UI fuzzing...')
      await runUIFuzz(iterations)
    }

    if (!isUI) {
      console.log('[Runner] Starting IPC fuzzing...')
      await fuzzMetadata(iterations)
      await fuzzDumpOperations(iterations)
    }

    console.log('')
    console.log('=== Fuzz Testing Complete ===')
    console.log('All fuzzing passed without crashes.')
  } catch (e) {
    console.error('')
    console.error('=== Fuzz Testing FAILED ===')
    console.error(String(e))
    exitCode = 1
  }

  process.exit(exitCode)
}

main()
