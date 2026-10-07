import type { ZodType } from 'zod'
import { ApiError, InvalidResponseError, SessionExpiredError } from './errors'

type Method = 'GET' | 'POST' | 'PUT'

export interface RequestOptions<T = unknown> {
  method?: Method
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  /** Set to false for endpoints that must not trigger session rotation (auth flow itself). */
  auth?: boolean
  /** Validates the response body. Without it the body is not checked: only for endpoints that return nothing. */
  schema?: ZodType<T>
}

export interface ApiClientOptions {
  baseUrl?: string
  getFingerprint: () => string
  /** Called when the session cannot be restored (rotate failed or retry got 401 again). */
  onSessionExpired: () => void
}

export interface ApiClient {
  request<T = void>(path: string, options?: RequestOptions<T>): Promise<T>
  /** Call before a new login and after logout: forgets session-related state, keeps CSRF. */
  reset(): void
}

/**
 * Transport layer: owns every cross-cutting HTTP concern so endpoint modules stay declarative.
 *  - `X-Requested-With` on every request;
 *  - CSRF bootstrap before the first request (single-flight) and one retry on 419;
 *  - on 401: one shared `/auth/token/rotate` for all concurrent callers, then a single retry;
 *  - response bodies checked against the endpoint's schema.
 */
export function createApiClient({ baseUrl = '', getFingerprint, onSessionExpired }: ApiClientOptions): ApiClient {
  let csrfToken: string | null = null
  let csrfRequest: Promise<string> | null = null
  let rotateRequest: Promise<void> | null = null
  /** Bumped by every successful rotate and by reset(); a 401 for an older generation just retries. */
  let sessionGeneration = 0
  /** Bumped by reset(): work started before a logout/new login must not touch the new session. */
  let epoch = 0
  /** Once the session is known dead, further 401s fail fast instead of rotating again. */
  let expired = false

  function expire(startedIn: number): never {
    if (startedIn === epoch && !expired) {
      expired = true
      onSessionExpired()
    }
    throw new SessionExpiredError()
  }

  function send(path: string, options: RequestOptions<unknown>, csrf: string | null): Promise<Response> {
    const method = options.method ?? 'GET'
    const headers: Record<string, string> = {
      ...options.headers,
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    }
    if (options.body !== undefined) headers['Content-Type'] = 'application/json'
    if (csrf && method !== 'GET') headers['X-CSRF-TOKEN'] = csrf

    return fetch(baseUrl + path, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'include',
      signal: options.signal,
    })
  }

  function getCsrfToken(): Promise<string> {
    if (csrfToken) return Promise.resolve(csrfToken)
    csrfRequest ??= send('/csrf', {}, null)
      .then(async (response) => {
        const token = response.headers.get('X-CSRF-TOKEN')
        if (!response.ok || !token) throw await ApiError.fromResponse(response)
        csrfToken = token
        return token
      })
      .finally(() => {
        csrfRequest = null
      })
    return csrfRequest
  }

  /** Sends the request with a CSRF token; on 419 refreshes the token and retries once. */
  async function sendWithCsrf(path: string, options: RequestOptions<unknown>): Promise<Response> {
    const token = await getCsrfToken()
    const response = await send(path, options, token)
    if (response.status !== 419) return response

    // Only drop the token if nobody refreshed it in the meantime.
    if (csrfToken === token) csrfToken = null
    return send(path, options, await getCsrfToken())
  }

  /** Shared by all concurrent 401s. Goes through sendWithCsrf, not request(), so it can never trigger itself. */
  function rotateSession(): Promise<void> {
    if (rotateRequest) return rotateRequest
    const startedIn = epoch
    const rotation: Promise<void> = sendWithCsrf('/auth/token/rotate', {
      method: 'POST',
      body: { fingerprint: getFingerprint() },
    })
      .then((response) => {
        if (startedIn !== epoch || !response.ok) expire(startedIn)
        sessionGeneration += 1
      })
      // A rotate that failed for any reason (including network) means the session can't be proven.
      .catch(() => expire(startedIn))
      .finally(() => {
        if (rotateRequest === rotation) rotateRequest = null
      })
    rotateRequest = rotation
    return rotation
  }

  async function request<T = void>(path: string, options: RequestOptions<T> = {}): Promise<T> {
    const withAuth = options.auth !== false

    // A request started while rotate is in flight waits for it instead of collecting a guaranteed 401.
    if (withAuth && rotateRequest) await rotateRequest
    const startedIn = epoch
    const generation = sessionGeneration

    let response = await sendWithCsrf(path, options)

    if (response.status === 401 && withAuth) {
      if (expired) expire(startedIn)
      // If someone rotated after we sent, just retry; otherwise join/start the shared rotate.
      if (generation === sessionGeneration) await rotateSession()
      response = await sendWithCsrf(path, options)
      if (response.status === 401) expire(startedIn)
    }

    if (!response.ok) throw await ApiError.fromResponse(response)
    return parseBody(response, options.schema)
  }

  return {
    request,
    reset() {
      epoch += 1
      rotateRequest = null
      sessionGeneration += 1
      expired = false
    },
  }
}

async function parseBody<T>(response: Response, schema: ZodType<T> | undefined): Promise<T> {
  const text = await response.text()
  // Endpoints without a body (204, empty 200) resolve to undefined; callers type them as `void`.
  if (!schema) return (text ? JSON.parse(text) : undefined) as T
  const parsed = schema.safeParse(text ? JSON.parse(text) : undefined)
  if (!parsed.success) throw new InvalidResponseError(response.status, parsed.error.issues)
  return parsed.data
}
