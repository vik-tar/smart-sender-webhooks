import { getFingerprint } from '../lib/fingerprint'
import { createApiClient } from './client'
import { createEndpoints } from './endpoints'

type Listener = () => void
const expiredListeners = new Set<Listener>()

export const apiClient = createApiClient({
  getFingerprint,
  onSessionExpired: () => expiredListeners.forEach((listener) => listener()),
})

export const api = createEndpoints(apiClient, getFingerprint)

export function onSessionExpired(listener: Listener): () => void {
  expiredListeners.add(listener)
  return () => {
    expiredListeners.delete(listener)
  }
}
