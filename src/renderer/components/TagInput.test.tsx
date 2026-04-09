import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ComponentProps, HTMLAttributes, ReactNode } from 'react'
import { TagInput } from './TagInput'
import type { Tag } from '../lib/types'

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

const tags: Tag[] = [
  { id: 'tag-1', name: 'alpha', createdAt: 1 },
  { id: 'tag-2', name: 'beta', createdAt: 2 }
]

function renderTagInput(overrides: Partial<ComponentProps<typeof TagInput>> = {}) {
  return render(
    <TagInput
      open={true}
      onOpenChange={vi.fn()}
      onSubmit={vi.fn()}
      onReturnFocus={vi.fn()}
      selectedTagIds={[]}
      onTagsChange={vi.fn()}
      allTags={tags}
      getAISuggestions={vi.fn(() => [])}
      onCreateTag={vi.fn(async (name: string) => ({ id: 'tag-new', name, createdAt: Date.now() }))}
      dumpText="Fix keyboard nav"
      {...overrides}
    />
  )
}

describe('TagInput', () => {
  it('shows a visible highlighted tag while navigating with arrow keys', () => {
    renderTagInput()

    const input = screen.getByPlaceholderText('Search or create tag...')
    const alphaOption = screen.getByText('alpha').closest('[role="option"]')
    const betaOption = screen.getByText('beta').closest('[role="option"]')

    expect(alphaOption?.getAttribute('data-highlighted')).toBe('true')
    expect(input.getAttribute('aria-activedescendant')).toBe('tag-option-tag-1')

    fireEvent.keyDown(input, { key: 'ArrowDown' })

    expect(alphaOption?.getAttribute('data-highlighted')).toBe('false')
    expect(betaOption?.getAttribute('data-highlighted')).toBe('true')
    expect(input.getAttribute('aria-activedescendant')).toBe('tag-option-tag-2')
  })

  it('toggles the highlighted tag with Shift+Enter', () => {
    const onTagsChange = vi.fn()
    renderTagInput({ onTagsChange })

    const input = screen.getByPlaceholderText('Search or create tag...')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })

    expect(onTagsChange).toHaveBeenCalledWith(['tag-2'])
  })
})
