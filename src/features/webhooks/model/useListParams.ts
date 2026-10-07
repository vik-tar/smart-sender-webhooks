import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import type { WebhookListParams } from '../../../api/types'
import { readListParams, writeListParams } from './listParams'

/** URL is the single source of truth for list state; changes are history entries unless `replace` is set. */
export function useListParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = readListParams(searchParams)

  const update = useCallback(
    (patch: Partial<WebhookListParams>, replace = false) =>
      setSearchParams((current) => writeListParams(current, patch), { replace }),
    [setSearchParams],
  )
  const setPage = useCallback((page: number) => update({ page }), [update])
  const setSearch = useCallback((search: string, replace?: boolean) => update({ search }, replace), [update])

  return { ...params, setPage, setSearch }
}
