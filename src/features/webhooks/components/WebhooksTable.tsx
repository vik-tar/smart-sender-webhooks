import { Link, useLocation } from 'react-router'
import type { Webhook } from '../../../api/types'

interface WebhooksTableProps {
  webhooks: Webhook[]
  busy: boolean
}

export function WebhooksTable({ webhooks, busy }: WebhooksTableProps) {
  const location = useLocation()
  return (
    <table aria-busy={busy}>
      <thead>
        <tr>
          <th>Name</th>
          <th>URL</th>
          <th>Active</th>
          <th aria-label="Actions" />
        </tr>
      </thead>
      <tbody>
        {webhooks.map((webhook) => (
          <tr key={webhook.id}>
            <td>{webhook.name}</td>
            <td>
              <code>{webhook.url}</code>
            </td>
            <td>{webhook.active ? 'Yes' : 'No'}</td>
            <td>
              <Link to={`/webhooks/${webhook.id}/edit`} state={{ from: location }}>
                Edit
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
