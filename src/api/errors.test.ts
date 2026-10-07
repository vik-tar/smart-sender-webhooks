import { describe, expect, it } from 'vitest'
import { ApiError, formError } from './errors'

const validation = (payload: Record<string, string[]>) =>
  new ApiError(422, 'The given data was invalid.', 'ValidationException', payload)

describe('formError', () => {
  const rendered = ['email', 'password']

  it('is empty without an error', () => {
    expect(formError(null, rendered)).toBeUndefined()
  })

  it('stays silent when a rendered field already shows the error', () => {
    expect(formError(validation({ email: ['Bad email.'] }), rendered)).toBeUndefined()
  })

  it('surfaces errors of fields the form does not render', () => {
    const error = validation({ device_session_token: ['The device session token is invalid.'] })
    expect(formError(error, rendered)).toBe('The device session token is invalid.')
  })

  it('falls back to the error message', () => {
    expect(formError(new ApiError(500, 'Request failed with status 500'), rendered)).toBe('Request failed with status 500')
  })
})
