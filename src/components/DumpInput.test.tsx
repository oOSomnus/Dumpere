import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DumpInput } from '../renderer/components/DumpInput'
import { Project, Tag } from '../renderer/lib/types'

// Mock electron API
vi.stubGlobal('window', {
  electronAPI: {
    createDump: vi.fn(),
    getDumpsFromVault: vi.fn(() => Promise.resolve([])),
    getProjects: vi.fn(() => Promise.resolve([])),
    getTags: vi.fn(() => Promise.resolve([])),
  }
})

describe('DumpInput', () => {
  const mockOnSubmit = vi.fn()
  const mockProjects: Project[] = []
  const mockTags: Tag[] = []

  const defaultProps = {
    onSubmit: mockOnSubmit,
    projects: mockProjects,
    activeProjectId: null,
    onProjectSelect: vi.fn(),
    allTags: mockTags,
    selectedTagIds: [],
    onTagsChange: vi.fn(),
    getAISuggestions: vi.fn(() => []),
    onCreateTag: vi.fn(async () => ({ id: 'new', name: 'new-tag', createdAt: Date.now() })),
    dumpText: ''
  }

  beforeEach(() => {
    vi.clearAllMocks()
    defaultProps.onSubmit = mockOnSubmit
    defaultProps.onProjectSelect = vi.fn()
    defaultProps.onTagsChange = vi.fn()
    defaultProps.getAISuggestions = vi.fn(() => [])
    defaultProps.onCreateTag = vi.fn(async () => ({ id: 'new', name: 'new-tag', createdAt: Date.now() }))
  })

  it('renders textarea for input', () => {
    render(<DumpInput {...defaultProps} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders with placeholder text', () => {
    render(<DumpInput {...defaultProps} />)
    expect(screen.getByPlaceholderText(/Dump something/i)).toBeInTheDocument()
  })

  it('calls onSubmit when Enter is pressed with text', async () => {
    mockOnSubmit.mockResolvedValueOnce(undefined)

    render(<DumpInput {...defaultProps} />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Test dump content' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

    expect(mockOnSubmit).toHaveBeenCalledWith('Test dump content', [], null, [])
  })

  it('does not submit when textarea is empty', () => {
    render(<DumpInput {...defaultProps} />)

    const textarea = screen.getByRole('textbox')
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('does not submit when shift+Enter is pressed (allows newlines)', () => {
    render(<DumpInput {...defaultProps} />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Test with newline' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('clears textarea after successful submission', async () => {
    mockOnSubmit.mockResolvedValueOnce(undefined)

    render(<DumpInput {...defaultProps} />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Test content' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect((textarea as HTMLTextAreaElement).value).toBe('')
    })
  })

  it('renders textarea with correct styling classes', () => {
    render(<DumpInput {...defaultProps} />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveClass('flex-1')
  })
})
