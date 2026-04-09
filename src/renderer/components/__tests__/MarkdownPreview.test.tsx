import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarkdownPreview } from '../MarkdownPreview'

describe('MarkdownPreview', () => {
  it('renders bold text (PREVIEW-01)', () => {
    render(<MarkdownPreview content="This is **bold** text" />)
    expect(screen.getByText('bold')).toHaveClass('font-bold')
  })

  it('renders italic text (PREVIEW-02)', () => {
    render(<MarkdownPreview content="This is *italic* text" />)
    expect(screen.getByText('italic')).toHaveClass('italic')
  })

  it('renders inline code (PREVIEW-03)', () => {
    render(<MarkdownPreview content="Use `const x = 1` for declaration" />)
    const code = screen.getByText('const x = 1')
    expect(code).toHaveClass('bg-muted')
    expect(code.tagName).toBe('CODE')
  })

  it('renders code blocks (PREVIEW-04)', () => {
    render(<MarkdownPreview content="```js\nconst x = 1\n```" />)
    const pre = screen.getByText('const x = 1').parentElement
    expect(pre?.tagName).toBe('PRE')
    expect(pre).toHaveClass('bg-muted')
  })

  it('renders links (PREVIEW-05)', () => {
    render(<MarkdownPreview content="[Click here](https://example.com)" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders images (PREVIEW-06)', () => {
    render(<MarkdownPreview content="![alt text](https://example.com/img.png)" />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('alt', 'alt text')
    expect(img).toHaveClass('max-w-full', 'rounded')
  })

  it('renders blockquotes (PREVIEW-07)', () => {
    render(<MarkdownPreview content="> This is a quote" />)
    const blockquote = screen.getByRole('blockquote')
    expect(blockquote).toHaveClass('border-l-4')
  })

  it('renders horizontal rules (PREVIEW-08)', () => {
    render(<MarkdownPreview content="---\nparagraph" />)
    expect(screen.getByRole('separator')).toBeInTheDocument()
  })

  it('renders ordered lists (PREVIEW-09)', () => {
    render(<MarkdownPreview content="1. First\n2. Second" />)
    expect(screen.getByRole('list')).toHaveAttribute('type', '1')
  })

  it('renders tables (PREVIEW-10)', () => {
    render(<MarkdownPreview content="| Header |\n| ------ |\n| Cell   |" />)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('renders strikethrough (PREVIEW-11)', () => {
    render(<MarkdownPreview content="~~deleted~~" />)
    const del = screen.getByText('deleted')
    expect(del).toHaveClass('line-through')
  })

  it('renders task lists (PREVIEW-12)', () => {
    render(<MarkdownPreview content="- [ ] Unchecked\n- [x] Checked" />)
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(2)
  })
})
