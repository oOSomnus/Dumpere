import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePrompt } from '../hooks/usePrompt'
import { renderWithPrompt } from '../test-utils'

function PromptHarness() {
  const prompt = usePrompt()

  return (
    <div>
      <button type="button" onClick={() => prompt.success('Saved changes')}>
        Show Success
      </button>
      <button
        type="button"
        onClick={async () => {
          const confirmed = await prompt.confirm({
            title: 'Delete item?',
            description: 'This cannot be undone.',
            confirmLabel: 'Delete',
            destructive: true
          })

          prompt.info(confirmed ? 'Confirmed' : 'Cancelled')
        }}
      >
        Show Confirm
      </button>
    </div>
  )
}

describe('PromptProvider', () => {
  it('renders app-styled success notifications', async () => {
    renderWithPrompt(<PromptHarness />)

    fireEvent.click(screen.getByText('Show Success'))

    expect(await screen.findByText('Saved changes')).toBeInTheDocument()
    expect(screen.getByText('Success')).toBeInTheDocument()
  })

  it('drives confirm flows for confirm and cancel', async () => {
    renderWithPrompt(<PromptHarness />)

    fireEvent.click(screen.getByText('Show Confirm'))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Confirmed')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Show Confirm'))
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(screen.getByText('Cancelled')).toBeInTheDocument()
    })
  })
})
