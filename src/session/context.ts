import { createContext, use } from 'react'
import type { LoginPayload, Me } from '../api/types'

export type Session = { status: 'anonymous'; expired?: boolean } | { status: 'authenticated'; user: Me }
export type AuthenticatedSession = Extract<Session, { status: 'authenticated' }>

export function isAuthenticated(session: Session): session is AuthenticatedSession {
  return session.status === 'authenticated'
}

export interface SessionContextValue {
  session: Session
  login(credentials: LoginPayload): Promise<void>
  logout(): Promise<void>
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession(): SessionContextValue {
  const context = use(SessionContext)
  if (!context) throw new Error('useSession must be used inside <SessionProvider>')
  return context
}
