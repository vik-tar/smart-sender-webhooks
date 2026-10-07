import type { ZodError } from 'zod'
import { apiErrorBodySchema } from './schemas'
import type { ApiErrorType, FieldErrors } from './types'

export class ApiError extends Error {
  readonly status: number
  readonly type: ApiErrorType | undefined
  readonly fieldErrors: FieldErrors

  constructor(status: number, message: string, type?: ApiErrorType, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.type = type
    this.fieldErrors = fieldErrors
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    const parsed = apiErrorBodySchema.safeParse(await response.json().catch(() => null))
    if (parsed.success) {
      const { type, message, payload } = parsed.data.error
      return new ApiError(response.status, message, type, payload ?? {})
    }
    return new ApiError(response.status, `Request failed with status ${response.status}`)
  }
}

/** Session is gone and could not be restored; the app is already returning to the login screen. */
export class SessionExpiredError extends ApiError {
  constructor() {
    super(401, 'Your session has expired. Please sign in again.', 'AuthenticationException')
    this.name = 'SessionExpiredError'
  }
}

/** A successful response whose body doesn't match the contract. Extends ApiError so it's never retried. */
export class InvalidResponseError extends ApiError {
  readonly issues: ZodError['issues']

  constructor(status: number, issues: ZodError['issues']) {
    super(status, 'The server returned an unexpected response.')
    this.name = 'InvalidResponseError'
    this.issues = issues
  }
}

export function isApiError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status)
}

/**
 * Message for the form-level alert: undefined when there is no error or a rendered field already shows it,
 * otherwise the first error of a field the form doesn't render (e.g. captcha, device token) or the general message.
 */
export function formError(error: unknown, renderedFields: readonly string[]): string | undefined {
  if (!error) return undefined
  if (!isApiError(error)) return errorMessage(error)
  if (renderedFields.some((field) => error.fieldErrors[field]?.length)) return undefined
  return Object.values(error.fieldErrors)[0]?.[0] ?? error.message
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.'
}
