import { Navigate, Outlet, useLocation } from 'react-router'
import { isAuthenticated, useSession } from './context'

/** Sends anonymous users to /login, remembering where they were (incl. list params) to come back after. */
export function RequireAuth() {
  const { session } = useSession()
  const location = useLocation()
  if (!isAuthenticated(session)) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
