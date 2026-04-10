import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { ResetButton } from './ResetButton'

describe('ResetButton', () => {
  it('renders without crashing', () => {
    const onClick = vi.fn()
    const { container } = render(<ResetButton onClick={onClick} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('calls onClick when button is clicked', () => {
    const onClick = vi.fn()
    const { container } = render(<ResetButton onClick={onClick} />)
    const button = container.querySelector('button')
    expect(button).toBeTruthy()
    fireEvent.click(button!)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('has aria-label for accessibility', () => {
    const onClick = vi.fn()
    const { container } = render(<ResetButton onClick={onClick} />)
    const button = container.querySelector('button')
    expect(button?.getAttribute('aria-label')).toBe('Reset panel sizes')
  })
})
