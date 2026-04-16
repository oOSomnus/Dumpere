// e2e/fuzz/generators/malform.ts
// Predefined malicious templates for fuzz testing

export const xssPayloads = [
  '<script>alert(1)</script>',
  '"><img src=x onerror=alert(1)>',
  '{{constructor.constructor("alert(1)")()}}',
  '<svg onload=alert(1)>',
  '<body onload=alert(1)>',
  'javascript:alert(1)',
  '<a href="javascript:alert(1)">click</a>',
]

export const pathTraversal = [
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32\\config\\sam',
  '\0nullbyte',
  '....//....//....//etc/passwd',
  '/etc/passwd',
  'C:\\Windows\\System32\\config\\sam',
]

export const unicodeMischief = [
  '\u202E<script>', // RLO injection
  '\uFEFF<script>', // BOM injection
  '\u0000.txt', // Null byte in filename
  '\u200B\u200B<script>', // Zero-width space
  '\uD83D\uDE00', // Emoji overload
]

export const superLongStrings = [
  'A'.repeat(10000),
  'A'.repeat(100000),
  '\n'.repeat(10000),
  '\t'.repeat(10000),
]

export const specialCharacters = [
  '\x00\x01\x02\x03\x04\x05', // Control chars
  '💩'.repeat(1000), // Emoji
  'Ṱ̺̺̐h̶̰͒e̵͓̒ ̴̥̈C̸̡̈ņ̰͛ợ̼̌n̶͙͛t̷͚̎e̸͛̈n̷̰͑t', // Combining chars
]

export const malformedJson = [
  '{"incomplete":',
  '{"trailing": "comma",}',
  '{"duplicate": "keys", "duplicate": "should"}',
  '[{"unterminated":]',
  '{{bad": "array"}}',
]

export function getAllMalformTemplates() {
  return {
    xssPayloads,
    pathTraversal,
    unicodeMischief,
    superLongStrings,
    specialCharacters,
    malformedJson,
  }
}

export function getRandomMalform(category?: keyof ReturnType<typeof getAllMalformTemplates>) {
  const templates = getAllMalformTemplates()
  if (category && templates[category]) {
    return templates[category][Math.floor(Math.random() * templates[category].length)]
  }
  const allValues = Object.values(templates).flat()
  return allValues[Math.floor(Math.random() * allValues.length)]
}
