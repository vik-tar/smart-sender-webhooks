import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api/errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    // API errors (401/404/422) are answers, not glitches — retrying them only delays the error state.
    queries: { retry: (failureCount, error) => !(error instanceof ApiError) && failureCount < 2 },
    mutations: { retry: false },
  },
})
