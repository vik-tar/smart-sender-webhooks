import type { EmptyReason } from '../model/listParams'

const EMPTY_TEXT: Record<EmptyReason, { message: (search: string) => string; action?: string }> = {
  'past-end': { message: () => 'This page does not exist.', action: 'Go to first page' },
  'no-matches': { message: (search) => `No webhooks match “${search}”.`, action: 'Clear search' },
  none: { message: () => 'No webhooks yet.' },
}

interface EmptyStateProps {
  reason: EmptyReason
  search: string
  onReset: () => void
}

export function EmptyState({ reason, search, onReset }: EmptyStateProps) {
  const { message, action } = EMPTY_TEXT[reason]
  return (
    <div>
      <p>{message(search)}</p>
      {action && (
        <button type="button" onClick={onReset}>
          {action}
        </button>
      )}
    </div>
  )
}
