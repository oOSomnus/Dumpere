import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function isDirectExecution(importMetaUrl: string, argvPath: string | undefined = process.argv[1]): boolean {
  if (!argvPath) {
    return false
  }

  return path.resolve(argvPath) === fileURLToPath(importMetaUrl)
}
