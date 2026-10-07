import { useState } from 'react'
import { Outlet } from 'react-router'
import { isAuthenticated, useSession } from './session/context'

export function AppLayout() {
  const { session, logout } = useSession()
  const [loggingOut, setLoggingOut] = useState(false)

  function handleLogout() {
    setLoggingOut(true)
    // logout() always ends the local session; a failed revoke is not the user's problem.
    logout().catch(() => undefined)
  }

  return (
    <>
      <header className="app-header">
        <strong>Smart Sender</strong>
        <span className="app-header__user">
          {isAuthenticated(session) && session.user.name}
          <button type="button" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </span>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}
