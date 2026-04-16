// e2e/fuzz/generators/random.ts
// Random data generation functions

function randomString(length: number, charset?: string): string {
  const defaultCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const chars = charset ?? defaultCharset
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]!
  }
  return result
}

export function randomAlphaNumeric(length: number): string {
  return randomString(length)
}

export function randomUnicode(length: number): string {
  const unicodeChars: string[] = []
  for (let i = 0; i < length; i++) {
    unicodeChars.push(String.fromCharCode(Math.floor(Math.random() * 0xFFFF)))
  }
  return unicodeChars.join('')
}

export function randomFilename(extension?: string): string {
  const name = randomString(8, 'abcdefghijklmnopqrstuvwxyz')
  const ext = extension ?? randomString(3, 'abcdefghijklmnopqrstuvwxyz')
  return `${name}.${ext}`
}

export function randomMimeType(): string {
  const types = [
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'application/json',
    'audio/mpeg', 'video/mp4', 'application/zip',
  ]
  return types[Math.floor(Math.random() * types.length)]!
}

export function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function randomProjectName(): string {
  const prefixes = ['Project', 'Work', 'Home', 'Test', 'Dev']
  const suffixes = ['', ' Alpha', ' Beta', ' v2', ' (copy)']
  return prefixes[Math.floor(Math.random() * prefixes.length)!] +
    randomString(4) +
    suffixes[Math.floor(Math.random() * suffixes.length)!]
}

export function randomDumpText(): string {
  const templates = [
    () => randomString(Math.floor(Math.random() * 500)),
    () => randomUnicode(Math.floor(Math.random() * 200)),
    () => `Dump with ${randomString(10)} and special ${randomString(5, '!@#$%^&*()')}`,
  ]
  return templates[Math.floor(Math.random() * templates.length)]!()
}

export function randomBoolean(): boolean {
  return Math.random() < 0.5
}

export function randomArrayElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
