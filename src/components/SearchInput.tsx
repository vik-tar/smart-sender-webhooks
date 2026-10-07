import { useEffect, useState } from 'react'

const DEBOUNCE_MS = 300

interface SearchInputProps {
  value: string
  /** Accessible name and placeholder, e.g. "Search by name". */
  label: string
  /** `replace` is true for follow-up commits of the same typing session. */
  onChange: (value: string, replace: boolean) => void
}

/**
 * Typing stays local; the URL is updated once the user pauses. One typing session (until blur, Enter
 * or an outside URL change) is one history entry: the first commit pushes, later ones replace it.
 */
export function SearchInput({ value, label, onChange }: SearchInputProps) {
  const [draft, setDraft] = useState(value)
  const [lastValue, setLastValue] = useState(value)
  const [sessionPushed, setSessionPushed] = useState(false)
  // URL changed from outside (back/forward, "clear search"): adopt it and start a new session.
  if (value !== lastValue) {
    setLastValue(value)
    if (value !== draft.trim()) {
      setDraft(value)
      setSessionPushed(false)
    }
  }

  useEffect(() => {
    if (draft.trim() === value) return
    const timer = setTimeout(() => {
      onChange(draft, sessionPushed)
      setSessionPushed(true)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft, value, onChange, sessionPushed])

  // Leaving the field (clicking a link or button) or pressing Enter commits right away, so a pending draft is never lost.
  function commit() {
    if (draft.trim() !== value) onChange(draft, sessionPushed)
    setSessionPushed(false)
  }

  return (
    <input
      type="search"
      aria-label={label}
      placeholder={label}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit()
      }}
    />
  )
}
