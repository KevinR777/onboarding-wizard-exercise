import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import { theme } from '../theme'
import { ToastProvider } from '../components/Toast/ToastProvider'

type RenderWithProvidersOptions = {
  initialEntries?: string[]
}

export const renderWithProviders = (ui: ReactElement, options: RenderWithProvidersOptions = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <ToastProvider>
          <MemoryRouter initialEntries={options.initialEntries ?? ['/onboarding-wizard/test-session-id']}>
            <Routes>
              <Route path="/onboarding-wizard/:sessionId" element={ui} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}
