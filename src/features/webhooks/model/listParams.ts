import type { WebhookListParams } from '../../../api/types'

/** Tolerant parse: anything that isn't a positive integer page means page 1. */
export function readListParams(params: URLSearchParams): WebhookListParams {
  const page = Number(params.get('page'))
  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    search: params.get('search')?.trim() ?? '',
  }
}

/** Returns new params; a search change always goes back to page 1. Defaults are omitted from the URL. */
export function writeListParams(current: URLSearchParams, patch: Partial<WebhookListParams>): URLSearchParams {
  const next = new URLSearchParams(current)
  if (patch.search !== undefined) {
    const search = patch.search.trim()
    if (search) next.set('search', search)
    else next.delete('search')
    next.delete('page')
  }
  if (patch.page !== undefined) {
    if (patch.page > 1) next.set('page', String(patch.page))
    else next.delete('page')
  }
  return next
}

export type EmptyReason = 'past-end' | 'no-matches' | 'none'

/** Why a page came back empty: the URL page is beyond the last one, the search matched nothing, or there's no data. */
export function emptyReason({ page, search }: WebhookListParams, lastPage: number): EmptyReason {
  if (page > lastPage) return 'past-end'
  return search ? 'no-matches' : 'none'
}
