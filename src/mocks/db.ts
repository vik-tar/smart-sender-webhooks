import type { Me, Webhook } from '../api/types'

export const CREDENTIALS = { email: 'demo@smartsender.dev', password: 'password123' } as const

export const CSRF_TOKEN = 'mock-csrf-token-7f3a9c'

export const USER: Me = {
  id: 1,
  email: CREDENTIALS.email,
  first_name: 'Demo',
  last_name: 'User',
  name: 'Demo User',
}

const SOURCES = ['Order', 'Payment', 'Subscriber', 'Campaign', 'Invoice', 'Lead', 'Ticket']
const EVENTS = ['created', 'updated', 'deleted', 'failed']

function seedWebhooks(count: number): Webhook[] {
  const start = Date.UTC(2026, 0, 1)
  return Array.from({ length: count }, (_, index) => {
    const id = index + 1
    const source = SOURCES[index % SOURCES.length] ?? 'Event'
    const event = EVENTS[Math.floor(index / SOURCES.length) % EVENTS.length] ?? 'created'
    return {
      id,
      name: `${source} ${event}`,
      url: `https://hooks.example.com/${source.toLowerCase()}/${event}`,
      active: id % 3 !== 0,
      created_at: new Date(start + id * 86_400_000).toISOString(),
    }
  })
}

let webhooks: Webhook[] = seedWebhooks(28)

export const db = {
  /** Stable order: by id. */
  listWebhooks(search: string): Webhook[] {
    const needle = search.trim().toLowerCase()
    return needle ? webhooks.filter((webhook) => webhook.name.toLowerCase().includes(needle)) : webhooks
  },
  findWebhook(id: number): Webhook | undefined {
    return webhooks.find((webhook) => webhook.id === id)
  },
  updateWebhook(id: number, patch: Pick<Webhook, 'name' | 'url'>): Webhook | undefined {
    const current = webhooks.find((webhook) => webhook.id === id)
    if (!current) return undefined
    const updated = { ...current, ...patch }
    webhooks = webhooks.map((webhook) => (webhook.id === id ? updated : webhook))
    return updated
  },
  reset() {
    webhooks = seedWebhooks(28)
  },
}
