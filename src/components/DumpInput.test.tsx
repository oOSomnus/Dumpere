import { useState, type HTMLAttributes, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DumpInput } from '../renderer/components/DumpInput'
import { Project, Tag, mockElectronAPI } from '../renderer/lib/types'

vi.mock('../renderer/components/ProjectSelector', () => ({
  ProjectSelector: ({
    activeProjectId,
    onSelect,
    emptyLabel
  }: {
    activeProjectId: string | null
    onSelect: (projectId: string | null) => void
    emptyLabel?: string
  }) => (
    <button type="button" onClick={() => onSelect('project-1')}>
      {activeProjectId ?? emptyLabel ?? 'All Projects'}
    </button>
  )
}))

vi.mock('@radix-ui/react-popover', async () => {
  const React = await import('react')
  const OpenContext = React.createContext(false)
  type MockPopoverContentProps = HTMLAttributes<HTMLDivElement> & {
    onOpenAutoFocus?: unknown
    onCloseAutoFocus?: unknown
  }

  const Root = ({
    open,
    children
  }: {
    open: boolean
    children: ReactNode
  }) => (
    <OpenContext.Provider value={open}>{children}</OpenContext.Provider>
  )

  const Anchor = ({ children }: { children: ReactNode }) => <>{children}</>
  const Portal = ({ children }: { children: ReactNode }) => <>{children}</>
  const Content = React.forwardRef<HTMLDivElement, MockPopoverContentProps>(
    ({ children, onOpenAutoFocus: _onOpenAutoFocus, onCloseAutoFocus: _onCloseAutoFocus, ...props }, ref) => {
      const open = React.useContext(OpenContext)
      if (!open) return null

      return (
        <div ref={ref} role="dialog" {...props}>
          {children}
        </div>
      )
    }
  )

  Content.displayName = 'MockPopoverContent'

  return {
    Root,
    Anchor,
    Portal,
    Content
  }
})

describe('DumpInput', () => {
  const mockOnSubmit = vi.fn()
  const mockProjects: Project[] = [
    { id: 'project-1', name: 'Project One', createdAt: Date.now() }
  ]
  const baseTags: Tag[] = [
    { id: 'tag-existing', name: 'existing', createdAt: Date.now() }
  ]

  function renderHarness(overrides: Partial<{
    tags: Tag[]
    onCreateTag: (name: string) => Promise<Tag>
    getAISuggestions: (text: string) => Tag[]
    initialProjectId: string | null
  }> = {}) {
    const tags = overrides.tags || baseTags
    const onCreateTag = overrides.onCreateTag || vi.fn(async (name: string) => ({
      id: 'tag-new',
      name,
      createdAt: Date.now()
    }))
    const getAISuggestions = overrides.getAISuggestions || vi.fn(() => [])

    return render(
      <Harness
        tags={tags}
        onCreateTag={onCreateTag}
        getAISuggestions={getAISuggestions}
        initialProjectId={overrides.initialProjectId}
      />
    )
  }

  function Harness({
    tags,
    onCreateTag,
    getAISuggestions,
    initialProjectId = null
  }: {
    tags: Tag[]
    onCreateTag: (name: string) => Promise<Tag>
    getAISuggestions: (text: string) => Tag[]
    initialProjectId?: string | null
  }) {
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
    const [projectId, setProjectId] = useState<string | null>(initialProjectId)

    return (
      <DumpInput
        onSubmit={mockOnSubmit}
        projects={mockProjects}
        activeProjectId={projectId}
        onProjectSelect={setProjectId}
        allTags={tags}
        selectedTagIds={selectedTagIds}
        onTagsChange={setSelectedTagIds}
        getAISuggestions={getAISuggestions}
        onCreateTag={onCreateTag}
      />
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(mockElectronAPI, 'createTempAttachment').mockResolvedValue('/tmp/pasted-image.png')
    mockOnSubmit.mockResolvedValue(undefined)
  })

  it('focuses the textarea on mount', async () => {
    renderHarness()
    const textarea = screen.getByPlaceholderText(/Dump something/i)
    await waitFor(() => {
      expect(document.activeElement).toBe(textarea)
    })
  })

  it('submits when Enter is pressed twice with no tag text', async () => {
    renderHarness({ initialProjectId: 'project-1' })

    const textarea = screen.getByPlaceholderText(/Dump something/i)
    fireEvent.change(textarea, { target: { value: 'Test dump content' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })

    await waitFor(() => {
      expect((document.activeElement as HTMLInputElement | null)?.placeholder).toBe('Search or create tag...')
    })

    fireEvent.keyDown(document.activeElement as HTMLInputElement, { key: 'Enter' })

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('Test dump content', [], 'project-1', [])
    })
  })

  it('creates a new tag when typing in the tag input and pressing Enter', async () => {
    const onCreateTag = vi.fn(async (name: string) => ({
      id: 'tag-new',
      name,
      createdAt: Date.now()
    }))
    renderHarness({ onCreateTag, tags: [] })

    const textarea = screen.getByPlaceholderText(/Dump something/i)
    fireEvent.change(textarea, { target: { value: 'Need a new tag' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })

    const tagInput = await screen.findByPlaceholderText('Search or create tag...')
    fireEvent.focus(tagInput)
    fireEvent.change(tagInput, { target: { value: 'urgent' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    await waitFor(() => {
      expect(onCreateTag).toHaveBeenCalledWith('urgent')
    })

    expect((tagInput as HTMLInputElement).value).toBe('')
  })

  it('selects the highlighted tag with Shift+Enter and submits on the next Enter', async () => {
    renderHarness({ initialProjectId: 'project-1' })

    const textarea = screen.getByPlaceholderText(/Dump something/i)
    fireEvent.change(textarea, { target: { value: 'Tagged dump content' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })

    const tagInput = await screen.findByPlaceholderText('Search or create tag...')
    fireEvent.focus(tagInput)
    fireEvent.keyDown(tagInput, { key: 'Enter', shiftKey: true })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('Tagged dump content', [], 'project-1', ['tag-existing'])
    })
  })

  it('creates a temp attachment when pasting an image without a path', async () => {
    renderHarness({ tags: [], initialProjectId: 'project-1' })

    const textarea = screen.getByPlaceholderText(/Dump something/i)
    const imageFile = new File(['binary'], '', { type: 'image/png' })
    Object.defineProperty(imageFile, 'arrayBuffer', {
      value: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer)
    })

    fireEvent.paste(textarea, {
      clipboardData: {
        items: [
          {
            kind: 'file',
            getAsFile: () => imageFile
          }
        ]
      }
    })

    await waitFor(() => {
      expect(mockElectronAPI.createTempAttachment).toHaveBeenCalled()
    })

    fireEvent.change(textarea, { target: { value: 'Screenshot attached' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })
    const tagInput = await screen.findByPlaceholderText('Search or create tag...')
    fireEvent.focus(tagInput)
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('Screenshot attached', ['/tmp/pasted-image.png'], 'project-1', [])
    })
  })

  it('shows a validation message and blocks submit when no project is assigned', async () => {
    renderHarness()

    const textarea = screen.getByPlaceholderText(/Dump something/i)
    fireEvent.change(textarea, { target: { value: 'Needs a project' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })

    const tagInput = await screen.findByPlaceholderText('Search or create tag...')
    fireEvent.focus(tagInput)
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    expect(mockOnSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Assign a project before saving a dump.')).toBeInTheDocument()
  })
})
