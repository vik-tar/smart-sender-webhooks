import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { errorMessage, isApiError } from '../api/errors'
import { useWebhook, WebhookForm } from '../features/webhooks'
import { readFrom } from '../lib/navigation'

export function WebhookEditPage() {
  const id = Number(useParams().id)
  const location = useLocation()
  const navigate = useNavigate()
  const query = useWebhook(id)

  // Came from the list → step back to it (keeps page/search, no extra history entry); direct entry → list root.
  function goBack() {
    if (readFrom(location.state)) void navigate(-1)
    else void navigate('/webhooks')
  }

  if (!Number.isInteger(id) || id <= 0 || isApiError(query.error, 404)) return <NotFound />
  if (query.isPending) return <p role="status">Loading webhook…</p>
  if (query.isError) return <p role="alert">Could not load webhook: {errorMessage(query.error)}</p>

  return (
    <section>
      <h1>Edit webhook</h1>
      <WebhookForm key={query.data.id} webhook={query.data} onDone={goBack} />
    </section>
  )
}

function NotFound() {
  return (
    <section>
      <h1>Webhook not found</h1>
      <Link to="/webhooks">Back to webhooks</Link>
    </section>
  )
}
