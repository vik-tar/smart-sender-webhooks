import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import './index.css'
import { worker } from './mocks/browser'
import { queryClient } from './queryClient'
import { router } from './router'
import { SessionProvider } from './session/SessionProvider'

// The mock *is* the backend for this app, so it's enabled in every build mode.
async function enableMocking() {
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
}

void enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
})
