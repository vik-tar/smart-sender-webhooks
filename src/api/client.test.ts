import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { CREDENTIALS, db } from '../mocks/db'
import { handlers } from '../mocks/handlers'
import { sessionStore } from '../mocks/session'
import { createApiClient } from './client'
import { createEndpoints, type Endpoints } from './endpoints'
import { InvalidResponseError, SessionExpiredError } from './errors'

const BASE_URL = 'http://localhost'
const FINGERPRINT = '0123456789abcdef0123456789abcdef'
const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  server.events.removeAllListeners()
  sessionStore.reset()
  db.reset()
})
afterAll(() => server.close())

function setup() {
  const onSessionExpired = vi.fn()
  const getFingerprint = () => FINGERPRINT
  const client = createApiClient({ baseUrl: BASE_URL, getFingerprint, onSessionExpired })
  return { api: createEndpoints(client, getFingerprint), client, onSessionExpired }
}

/** Counts requests per pathname from this point on. */
function trackRequests() {
  const counts = new Map<string, number>()
  server.events.on('request:start', ({ request }) => {
    const path = new URL(request.url).pathname
    counts.set(path, (counts.get(path) ?? 0) + 1)
  })
  return (path: string) => counts.get(path) ?? 0
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

/** Answers the next GET /v1/webhooks with 401, but only after `gate` resolves. */
function delayed401ForList(gate: Promise<void>) {
  server.use(
    http.get(
      '*/v1/webhooks',
      async () => {
        await gate
        return HttpResponse.json(
          { error: { type: 'AuthenticationException', message: 'Unauthenticated.' } },
          { status: 401 },
        )
      },
      { once: true },
    ),
  )
}

async function signIn(api: Endpoints) {
  const { device_session_token } = await api.login(CREDENTIALS)
  await api.issue(device_session_token)
}

it('two parallel 401s share one rotate and both retries succeed', async () => {
  const { api, onSessionExpired } = setup()
  await signIn(api)
  sessionStore.expireNow()
  const count = trackRequests()

  const [me, list] = await Promise.all([api.getMe(), api.listWebhooks({ page: 1, search: '' })])

  expect(me.email).toBe(CREDENTIALS.email)
  expect(list.data).toHaveLength(10)
  expect(count('/auth/token/rotate')).toBe(1)
  expect(count('/v1/me')).toBe(2)
  expect(count('/v1/webhooks')).toBe(2)
  expect(onSessionExpired).not.toHaveBeenCalled()
})

it('failed rotate ends the session once for all pending requests', async () => {
  const { api, onSessionExpired } = setup()
  await signIn(api)
  sessionStore.revoke() // rotate now returns 400
  const count = trackRequests()

  const results = await Promise.allSettled([api.getMe(), api.listWebhooks({ page: 1, search: '' })])

  for (const result of results) {
    expect(result.status).toBe('rejected')
    if (result.status === 'rejected') expect(result.reason).toBeInstanceOf(SessionExpiredError)
  }
  expect(count('/auth/token/rotate')).toBe(1)
  expect(onSessionExpired).toHaveBeenCalledTimes(1)
})

it('a 401 that lands after rotate already finished retries without a second rotate', async () => {
  const { api, onSessionExpired } = setup()
  await signIn(api)
  sessionStore.expireNow()
  const count = trackRequests()
  // Release the list's 401 only once /v1/me is being retried, i.e. the shared rotate has completed.
  const meRetried = deferred()
  server.events.on('request:start', ({ request }) => {
    if (new URL(request.url).pathname === '/v1/me' && count('/v1/me') === 2) meRetried.resolve()
  })
  delayed401ForList(meRetried.promise)

  const [me, list] = await Promise.all([api.getMe(), api.listWebhooks({ page: 1, search: '' })])

  expect(me.email).toBe(CREDENTIALS.email)
  expect(list.data).toHaveLength(10)
  expect(count('/auth/token/rotate')).toBe(1)
  expect(onSessionExpired).not.toHaveBeenCalled()
})

it('a 401 that lands after the session was declared expired fails fast without rotating', async () => {
  const sessionEnded = deferred()
  const { api, onSessionExpired } = setup()
  onSessionExpired.mockImplementation(() => sessionEnded.resolve())
  await signIn(api)
  sessionStore.revoke()
  const count = trackRequests()
  delayed401ForList(sessionEnded.promise)

  const results = await Promise.allSettled([api.getMe(), api.listWebhooks({ page: 1, search: '' })])

  expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected'])
  expect(count('/auth/token/rotate')).toBe(1)
  expect(onSessionExpired).toHaveBeenCalledTimes(1)
})

it('a rotate that resolves after reset() (logout/new login) cannot end the new session', async () => {
  const { api, client, onSessionExpired } = setup()
  await signIn(api)
  sessionStore.revoke()
  const rotateStarted = deferred()
  const releaseRotate = deferred()
  server.use(
    http.post(
      '*/auth/token/rotate',
      async () => {
        rotateStarted.resolve()
        await releaseRotate.promise
        return HttpResponse.json({ error: { type: 'BadRequestException', message: 'Bad request.' } }, { status: 400 })
      },
      { once: true },
    ),
  )

  const stale = api.getMe().catch((error: unknown) => error)
  await rotateStarted.promise
  client.reset() // user logged out and is signing in again
  releaseRotate.resolve()
  await stale

  expect(onSessionExpired).not.toHaveBeenCalled()
})

it('refetches CSRF token on 419 and retries once', async () => {
  const { api } = setup()
  await signIn(api)
  server.use(
    http.put(
      '*/v1/webhooks/:id',
      () =>
        HttpResponse.json(
          { error: { type: 'TokenMismatchException', message: 'CSRF token mismatch.' } },
          { status: 419 },
        ),
      { once: true },
    ),
  )
  const count = trackRequests()

  const updated = await api.updateWebhook(1, { name: 'Renamed', url: 'https://example.com/hook' })

  expect(updated.name).toBe('Renamed')
  expect(count('/csrf')).toBe(1)
  expect(count('/v1/webhooks/1')).toBe(2)
})

it('rejects a response that breaks the contract with InvalidResponseError', async () => {
  const { api } = setup()
  server.use(http.get('*/v1/webhooks/:id', () => HttpResponse.json({ id: '1', name: 'Orders' })))
  await api.login(CREDENTIALS).then(({ device_session_token }) => api.issue(device_session_token))

  const error = await api.getWebhook(1).catch((caught: unknown) => caught)

  expect(error).toBeInstanceOf(InvalidResponseError)
  expect((error as InvalidResponseError).issues.map((issue) => issue.path.join('.'))).toEqual([
    'id',
    'url',
    'active',
    'created_at',
  ])
})
