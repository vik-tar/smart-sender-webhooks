/**
 * Server-side session store — the mock's analogue of an HttpOnly cookie.
 * The client never sees session tokens; it only gets 200/401 from the API.
 */
export const SESSION_TTL_MS = 30_000

interface Session {
  fingerprint: string
  expiresAt: number
}

const deviceTokens = new Map<string, string>() // device_session_token -> fingerprint
let session: Session | null = null

export const sessionStore = {
  createDeviceToken(fingerprint: string): string {
    const token = crypto.randomUUID()
    deviceTokens.set(token, fingerprint)
    return token
  },

  /** Exchanges a one-time device token for a session. */
  issue(deviceToken: string, fingerprint: string): boolean {
    const owner = deviceTokens.get(deviceToken)
    deviceTokens.delete(deviceToken)
    if (owner !== fingerprint) return false
    session = { fingerprint, expiresAt: Date.now() + SESSION_TTL_MS }
    return true
  },

  rotate(fingerprint: string): boolean {
    if (!session || session.fingerprint !== fingerprint) return false
    session.expiresAt = Date.now() + SESSION_TTL_MS
    return true
  },

  revoke() {
    session = null
  },

  isValid(): boolean {
    return session !== null && session.expiresAt > Date.now()
  },

  /** Test helper: make the session expire immediately. */
  expireNow() {
    if (session) session.expiresAt = 0
  },

  reset() {
    session = null
    deviceTokens.clear()
  },
}
