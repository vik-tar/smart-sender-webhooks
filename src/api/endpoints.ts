import type { ApiClient } from './client'
import { loginResponseSchema, meSchema, webhookListSchema, webhookSchema } from './schemas'
import type { LoginPayload, WebhookListParams, WebhookUpdate } from './types'

export const PAGE_SIZE = 10
/** Contract requires a non-empty captcha token; the mock accepts any value, no widget needed. */
const CAPTCHA_STUB = 'mock-captcha-token'

/** Typed map of the API contract: response schemas live here. Auth endpoints opt out of the 401 → rotate flow. */
export function createEndpoints(client: ApiClient, getFingerprint: () => string) {
  return {
    login: ({ email, password }: LoginPayload) =>
      client.request('/auth/login', {
        method: 'POST',
        auth: false,
        schema: loginResponseSchema,
        headers: { 'X-Captcha-Token': CAPTCHA_STUB },
        body: { email, password, fingerprint: getFingerprint() },
      }),
    issue: (deviceSessionToken: string) =>
      client.request('/auth/token/issue', {
        method: 'POST',
        auth: false,
        body: { device_session_token: deviceSessionToken, fingerprint: getFingerprint() },
      }),
    revoke: () =>
      client.request('/auth/token/revoke', {
        method: 'POST',
        auth: false,
        body: { fingerprint: getFingerprint() },
      }),

    getMe: (signal?: AbortSignal) => client.request('/v1/me', { signal, schema: meSchema }),
    listWebhooks: ({ page, search }: WebhookListParams, signal?: AbortSignal) => {
      const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (search) query.set('search', search)
      return client.request(`/v1/webhooks?${query}`, { signal, schema: webhookListSchema })
    },
    getWebhook: (id: number, signal?: AbortSignal) =>
      client.request(`/v1/webhooks/${id}`, { signal, schema: webhookSchema }),
    updateWebhook: (id: number, data: WebhookUpdate) =>
      client.request(`/v1/webhooks/${id}`, { method: 'PUT', body: data, schema: webhookSchema }),
  }
}

export type Endpoints = ReturnType<typeof createEndpoints>
