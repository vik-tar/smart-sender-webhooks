const STORAGE_KEY = 'ss.fingerprint'
const FINGERPRINT_PATTERN = /^[0-9a-f]{32}$/

let cached: string | null = null

/** Stable device id: 32 hex chars, generated once and kept in localStorage (falls back to memory). */
export function getFingerprint(): string {
  cached ??= readStored() ?? store(generate())
  return cached
}

function readStored(): string | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value && FINGERPRINT_PATTERN.test(value) ? value : null
  } catch {
    return null
  }
}

function store(value: string): string {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Storage unavailable (private mode): fingerprint stays stable for this tab only.
  }
  return value
}

function generate(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
