import { errorMessage } from '../../../api/errors'
import { Pagination } from '../../../components/Pagination'
import { useWebhooksList } from '../api/queries'
import { emptyReason } from '../model/listParams'
import { useListParams } from '../model/useListParams'
import { EmptyState } from './EmptyState'
import { WebhooksTable } from './WebhooksTable'

export function WebhooksList() {
  const { page, search, setPage, setSearch } = useListParams()
  const query = useWebhooksList({ page, search })

  switch (query.status) {
    case 'pending':
      return <p role="status">Loading webhooks…</p>

    case 'error':
      return (
        <div role="alert">
          <p>Could not load webhooks: {errorMessage(query.error)}</p>
          <button type="button" onClick={() => void query.refetch()}>
            Try again
          </button>
        </div>
      )

    case 'success': {
      const { data, paging } = query.data
      if (data.length === 0) {
        const reason = emptyReason({ page, search }, paging.pages.last)
        // Past the end → first page (search kept); no matches → drop the search.
        const reset = reason === 'past-end' ? () => setPage(1) : () => setSearch('')
        return <EmptyState reason={reason} search={search} onReset={reset} />
      }

      return (
        <>
          <WebhooksTable webhooks={data} busy={query.isPlaceholderData} />
          <Pagination current={page} last={paging.pages.last} onChange={setPage} />
          <p>{paging.results.total} total</p>
        </>
      )
    }
  }
}
