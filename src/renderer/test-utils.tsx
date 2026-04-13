import { type ReactElement, type ReactNode } from 'react'
import { render, renderHook, type RenderHookOptions, type RenderOptions } from '@testing-library/react'
import { PromptProvider } from './components/PromptProvider'
import { I18nProvider } from './i18n'

function TestProviders({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <PromptProvider>
        {children}
      </PromptProvider>
    </I18nProvider>
  )
}

export function renderWithPrompt(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, {
    wrapper: TestProviders,
    ...options
  })
}

export function renderHookWithPrompt<Result, Props>(
  renderCallback: (initialProps: Props) => Result,
  options?: Omit<RenderHookOptions<Props>, 'wrapper'>
) {
  return renderHook(renderCallback, {
    wrapper: TestProviders,
    ...options
  })
}
