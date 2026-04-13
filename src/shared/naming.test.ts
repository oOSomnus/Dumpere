import { describe, expect, it } from 'vitest'
import { validateWorkspaceEntryName } from './naming'

describe('naming', () => {
  it('sanitizes Windows-invalid workspace note characters before adding .md', () => {
    expect(validateWorkspaceEntryName('Sprint: Plan?*', 'note')).toBe('Sprint- Plan-.md')
  })

  it('sanitizes Windows-invalid workspace folder characters', () => {
    expect(validateWorkspaceEntryName('Roadmap <Q2>|', 'folder')).toBe('Roadmap -Q2-')
  })

  it('drops trailing spaces and periods from workspace names', () => {
    expect(validateWorkspaceEntryName('Release Notes.   ', 'note')).toBe('Release Notes.md')
  })
})
