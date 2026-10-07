import { describe, expect, it } from 'vitest'
import { readFrom } from './navigation'

describe('readFrom', () => {
  it('returns only the path parts of a stored location', () => {
    const state = { from: { pathname: '/webhooks', search: '?page=2', hash: '', state: { x: 1 }, key: 'abc' } }
    expect(readFrom(state)).toEqual({ pathname: '/webhooks', search: '?page=2', hash: '' })
  })

  it.each([undefined, null, 'x', {}, { from: null }, { from: { pathname: 42 } }, { from: { pathname: '/x', search: 1 } }])(
    'ignores malformed state %j',
    (state) => {
      expect(readFrom(state)).toBeUndefined()
    },
  )
})
