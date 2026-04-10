import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { ResizeHandle } from './ResizeHandle'

describe('ResizeHandle', () => {
  it('renders with horizontal direction and col-resize cursor', () => {
    const onDragStart = vi.fn()
    const { container } = render(<ResizeHandle direction="horizontal" onDragStart={onDragStart} />)
    const div = container.firstChild as HTMLDivElement
    expect(div).toBeTruthy()
    expect(div.style.cursor).toBe('col-resize')
    expect(div.style.width).toBe('8px')
  })

  it('renders with vertical direction and row-resize cursor', () => {
    const onDragStart = vi.fn()
    const { container } = render(<ResizeHandle direction="vertical" onDragStart={onDragStart} />)
    const div = container.firstChild as HTMLDivElement
    expect(div).toBeTruthy()
    expect(div.style.cursor).toBe('row-resize')
    expect(div.style.height).toBe('8px')
  })

  it('calls onDragStart when mouse down', () => {
    const onDragStart = vi.fn()
    const { container } = render(<ResizeHandle direction="horizontal" onDragStart={onDragStart} />)
    const div = container.firstChild as HTMLDivElement
    fireEvent.mouseDown(div, { clientX: 100, clientY: 200 })
    expect(onDragStart).toHaveBeenCalledTimes(1)
  })
})
