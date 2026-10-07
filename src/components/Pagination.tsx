interface PaginationProps {
  current: number
  last: number
  onChange: (page: number) => void
}

export function Pagination({ current, last, onChange }: PaginationProps) {
  if (last <= 1) return null
  return (
    <nav aria-label="Pagination" className="pagination">
      <button type="button" disabled={current <= 1} onClick={() => onChange(current - 1)}>
        Previous
      </button>
      <span>
        Page {current} of {last}
      </span>
      <button type="button" disabled={current >= last} onClick={() => onChange(current + 1)}>
        Next
      </button>
    </nav>
  )
}
