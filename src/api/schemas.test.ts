import { describe, expect, it } from 'vitest'
import { apiErrorBodySchema, loginPayloadSchema, webhookUpdateSchema } from './schemas'

const messages = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((result.error?.issues ?? []).map((issue) => [issue.path.join('.'), issue.message]))

describe('webhookUpdateSchema', () => {
  it('trims values before sending', () => {
    expect(webhookUpdateSchema.parse({ name: '  Orders ', url: ' https://a.dev/hook ' })).toEqual({
      name: 'Orders',
      url: 'https://a.dev/hook',
    })
  })

  it('uses the same messages as the server', () => {
    expect(messages(webhookUpdateSchema.safeParse({ name: '   ', url: '' }))).toEqual({
      name: 'The name field is required.',
      url: 'The url field is required.',
    })
    expect(messages(webhookUpdateSchema.safeParse({ name: 'x'.repeat(256), url: 'nope' }))).toEqual({
      name: 'The name may not be greater than 255 characters.',
      url: 'The url must be a valid URL.',
    })
  })

  it('accepts only http(s) URLs, like the server', () => {
    expect(webhookUpdateSchema.safeParse({ name: 'a', url: 'ftp://a.dev' }).success).toBe(false)
    expect(webhookUpdateSchema.safeParse({ name: 'a', url: 'http://localhost:8080/x' }).success).toBe(true)
  })
})

describe('loginPayloadSchema', () => {
  it('requires a valid email and a non-empty password', () => {
    expect(messages(loginPayloadSchema.safeParse({ email: '', password: '' }))).toEqual({
      email: 'The email field is required.',
      password: 'The password field is required.',
    })
    expect(messages(loginPayloadSchema.safeParse({ email: 'demo@', password: 'x' }))).toEqual({
      email: 'The email must be a valid email address.',
    })
  })
})

describe('apiErrorBodySchema', () => {
  it('keeps the message when type or payload are unexpected', () => {
    const body = { error: { type: 'TeapotException', message: 'Nope.', payload: 'garbage' } }
    expect(apiErrorBodySchema.parse(body).error).toEqual({ type: undefined, message: 'Nope.', payload: null })
  })
})
