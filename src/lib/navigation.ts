import type { Path } from 'react-router'
import { z } from 'zod'

const fromStateSchema = z.object({
  from: z.object({
    pathname: z.string(),
    search: z.string().default(''),
    hash: z.string().default(''),
  }),
})

/** Typed read of `location.state.from`, set by RequireAuth and by list → edit links. */
export function readFrom(state: unknown): Path | undefined {
  const parsed = fromStateSchema.safeParse(state)
  return parsed.success ? parsed.data.from : undefined
}
