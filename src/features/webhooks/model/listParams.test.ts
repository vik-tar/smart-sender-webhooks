import { describe, expect, it } from 'vitest'
import { emptyReason, readListParams, writeListParams } from './listParams'

const parse = (query: string) => readListParams(new URLSearchParams(query))
const write = (query: string, patch: Parameters<typeof writeListParams>[1]) =>
  writeListParams(new URLSearchParams(query), patch).toString()

describe('readListParams', () => {
  it.each(['', 'page=abc', 'page=0', 'page=-1', 'page=2.5'])('falls back to page 1 for "%s"', (query) => {
    expect(parse(query).page).toBe(1)
  })

  it('reads page and trimmed search', () => {
    expect(parse('page=3&search=%20order%20')).toEqual({ page: 3, search: 'order' })
  })
})

describe('writeListParams', () => {
  it('search change resets page', () => {
    expect(write('page=3&search=a', { search: 'order' })).toBe('search=order')
  })

  it('empty search removes the param', () => {
    expect(write('search=a', { search: '  ' })).toBe('')
  })

  it('page 1 is implicit, other pages are kept with search', () => {
    expect(write('search=a&page=2', { page: 1 })).toBe('search=a')
    expect(write('search=a', { page: 4 })).toBe('search=a&page=4')
  })
})

describe('emptyReason', () => {
  it('page past the end wins over search', () => {
    expect(emptyReason({ page: 9, search: 'order' }, 2)).toBe('past-end')
  })

  it('search with no matches', () => {
    expect(emptyReason({ page: 1, search: 'zzz' }, 1)).toBe('no-matches')
  })

  it('no webhooks at all', () => {
    expect(emptyReason({ page: 1, search: '' }, 1)).toBe('none')
  })
})
