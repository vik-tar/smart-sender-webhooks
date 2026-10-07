import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, apiClient, onSessionExpired } from '../api'
import type { LoginPayload } from '../api/types'
import { SessionContext, type Session } from './context'

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session>({ status: 'anonymous' })

  // Deliberately no apiClient.reset() here: parallel 401s may still be landing, and the
  // client's `expired` flag is what keeps them from starting another rotate.
  const endSession = useCallback(
    (expired = false) => {
      queryClient.clear()
      setSession({ status: 'anonymous', expired })
    },
    [queryClient],
  )

  useEffect(() => onSessionExpired(() => endSession(true)), [endSession])

  const login = useCallback(async (credentials: LoginPayload) => {
    apiClient.reset()
    const { device_session_token } = await api.login(credentials)
    // The device token never leaves this function: exchanged right away, then dropped.
    await api.issue(device_session_token)
    const user = await api.getMe()
    setSession({ status: 'authenticated', user })
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.revoke()
    } finally {
      apiClient.reset()
      endSession()
    }
  }, [endSession])

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout])
  return <SessionContext value={value}>{children}</SessionContext>
}

