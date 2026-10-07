import { delay, http, HttpResponse } from 'msw'
import type { ApiErrorType, FieldErrors, WebhookList } from '../api/types'
import { CREDENTIALS, CSRF_TOKEN, USER, db } from './db'
import { sessionStore } from './session'

const PAGE_LIMIT = 10

const DEFAULT_MESSAGES: Record<ApiErrorType, string> = {
  BadRequestException: 'Bad request.',
  AuthenticationException: 'Unauthenticated.',
  NotFoundException: 'Not found.',
  TokenMismatchException: 'CSRF token mismatch.',
  ValidationException: 'The given data was invalid.',
}

const STATUS_TYPES = {
  400: 'BadRequestException',
  401: 'AuthenticationException',
  404: 'NotFoundException',
  419: 'TokenMismatchException',
  422: 'ValidationException',
} as const satisfies Record<number, ApiErrorType>

function errorResponse(status: keyof typeof STATUS_TYPES, payload?: FieldErrors) {
  const type = STATUS_TYPES[status]
  return HttpResponse.json(
    { error: { type, message: DEFAULT_MESSAGES[type], ...(payload && { payload }) } },
    { status },
  )
}

/** Guards run before the operation; each returns an error response or null. */
function checkXhr(request: Request) {
  return request.headers.get('X-Requested-With') === 'XMLHttpRequest' ? null : errorResponse(400)
}

function checkCsrf(request: Request) {
  return request.headers.get('X-CSRF-TOKEN') === CSRF_TOKEN ? null : errorResponse(419)
}

function checkSession() {
  return sessionStore.isValid() ? null : errorResponse(401)
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null)
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== ''
  } catch {
    return false
  }
}

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

// Guards run first, like auth middleware; delay only simulates the handler's work.
// `*/path` matches any origin, so handlers work both in the browser and in Node tests.
export const handlers = [
  http.get('*/csrf', ({ request }) => {
    return checkXhr(request) ?? new HttpResponse(null, { status: 204, headers: { 'X-CSRF-TOKEN': CSRF_TOKEN } })
  }),

  http.post('*/auth/login', async ({ request }) => {
    const guard = checkXhr(request) ?? checkCsrf(request)
    if (guard) return guard
    await delay()

    const body = await readBody(request)
    const email = str(body.email).trim()
    const password = str(body.password)
    const fingerprint = str(body.fingerprint)

    const errors: FieldErrors = {}
    if (!request.headers.get('X-Captcha-Token')) errors.captcha = ['The captcha token is required.']
    if (!email) errors.email = ['The email field is required.']
    if (!password) errors.password = ['The password field is required.']
    if (!fingerprint) errors.fingerprint = ['The fingerprint field is required.']
    if (Object.keys(errors).length === 0) {
      if (email.toLowerCase() !== CREDENTIALS.email) errors.email = ['These credentials do not match our records.']
      else if (password !== CREDENTIALS.password) errors.password = ['The provided password is incorrect.']
    }
    if (Object.keys(errors).length > 0) return errorResponse(422, errors)

    return HttpResponse.json({ device_session_token: sessionStore.createDeviceToken(fingerprint) })
  }),

  http.post('*/auth/token/issue', async ({ request }) => {
    const guard = checkXhr(request) ?? checkCsrf(request)
    if (guard) return guard
    const body = await readBody(request)
    const issued = sessionStore.issue(str(body.device_session_token), str(body.fingerprint))
    return issued
      ? new HttpResponse(null, { status: 200 })
      : errorResponse(422, { device_session_token: ['The device session token is invalid.'] })
  }),

  http.post('*/auth/token/rotate', async ({ request }) => {
    const guard = checkXhr(request) ?? checkCsrf(request)
    if (guard) return guard
    const body = await readBody(request)
    return sessionStore.rotate(str(body.fingerprint)) ? new HttpResponse(null, { status: 200 }) : errorResponse(400)
  }),

  http.post('*/auth/token/revoke', ({ request }) => {
    const guard = checkXhr(request) ?? checkCsrf(request)
    if (guard) return guard
    sessionStore.revoke()
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/v1/me', ({ request }) => {
    return checkXhr(request) ?? checkSession() ?? HttpResponse.json(USER)
  }),

  http.get('*/v1/webhooks', async ({ request }) => {
    const guard = checkXhr(request) ?? checkSession()
    if (guard) return guard
    await delay()

    const params = new URL(request.url).searchParams
    const page = positiveInt(params.get('page'), 1)
    const limit = positiveInt(params.get('limit'), PAGE_LIMIT)
    const matches = db.listWebhooks(params.get('search') ?? '')
    const offset = (page - 1) * limit

    const body: WebhookList = {
      data: matches.slice(offset, offset + limit),
      paging: {
        pages: { current: page, last: Math.max(1, Math.ceil(matches.length / limit)) },
        results: { total: matches.length, limitation: limit },
      },
    }
    return HttpResponse.json(body)
  }),

  http.get('*/v1/webhooks/:id', async ({ request, params }) => {
    const guard = checkXhr(request) ?? checkSession()
    if (guard) return guard
    await delay()
    const webhook = db.findWebhook(Number(params.id))
    return webhook ? HttpResponse.json(webhook) : errorResponse(404)
  }),

  http.put('*/v1/webhooks/:id', async ({ request, params }) => {
    const guard = checkXhr(request) ?? checkCsrf(request) ?? checkSession()
    if (guard) return guard
    await delay()
    if (!db.findWebhook(Number(params.id))) return errorResponse(404)

    const body = await readBody(request)
    const name = str(body.name).trim()
    const url = str(body.url).trim()

    const errors: FieldErrors = {}
    if (!name) errors.name = ['The name field is required.']
    else if (name.length > 255) errors.name = ['The name may not be greater than 255 characters.']
    if (!url) errors.url = ['The url field is required.']
    else if (!isHttpUrl(url)) errors.url = ['The url must be a valid URL.']
    if (Object.keys(errors).length > 0) return errorResponse(422, errors)

    return HttpResponse.json(db.updateWebhook(Number(params.id), { name, url }))
  }),
]
