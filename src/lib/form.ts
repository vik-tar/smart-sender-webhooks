import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { isApiError } from '../api/errors'

/** Puts a 422's field errors into the form (in `fields` order) and focuses the first one. */
export function setServerErrors<T extends FieldValues>(
  error: unknown,
  fields: readonly Path<T>[],
  setError: UseFormSetError<T>,
) {
  if (!isApiError(error)) return
  let shouldFocus = true
  for (const field of fields) {
    const message = error.fieldErrors[field]?.[0]
    if (!message) continue
    setError(field, { type: 'server', message }, { shouldFocus })
    shouldFocus = false
  }
}
