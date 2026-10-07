import { SearchInput } from '../components/SearchInput'
import { useListParams, WebhooksList } from '../features/webhooks'

export function WebhooksPage() {
  const { search, setSearch } = useListParams()

  return (
    <section>
      <h1>Webhooks</h1>
      <SearchInput value={search} label="Search by name" onChange={setSearch} />
      <WebhooksList />
    </section>
  )
}
