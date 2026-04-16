// @vitest-environment node

import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { pathToFileURL } from 'node:url'
import { isDirectExecution } from './is-direct-execution'

describe('isDirectExecution', () => {
  it('returns true when the module path matches the invoked script path', () => {
    const modulePath = path.resolve('/tmp/fuzz-entry.ts')

    expect(isDirectExecution(pathToFileURL(modulePath).href, modulePath)).toBe(true)
  })

  it('returns false when the module is imported by a different entrypoint', () => {
    const modulePath = path.resolve('/tmp/ui-fuzz/index.ts')
    const runnerPath = path.resolve('/tmp/run-fuzz.ts')

    expect(isDirectExecution(pathToFileURL(modulePath).href, runnerPath)).toBe(false)
  })

  it('returns false when there is no argv entrypoint', () => {
    const modulePath = path.resolve('/tmp/ui-fuzz/index.ts')

    expect(isDirectExecution(pathToFileURL(modulePath).href, undefined)).toBe(false)
  })
})
