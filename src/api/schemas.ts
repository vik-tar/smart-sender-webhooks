import { z } from 'zod'

// Responses: parsed at the boundary, so contract drift fails in one place instead of deep inside the UI.

export const webhookSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  url: z.string(),
  active: z.boolean(),
  created_at: z.string(),
})

export const webhookListSchema = z.object({
  data: z.array(webhookSchema),
  paging: z.object({
    pages: z.object({ current: z.number().int(), last: z.number().int() }),
    results: z.object({ total: z.number().int(), limitation: z.number().int() }),
  }),
})

export const meSchema = z.object({
  id: z.number().int(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  name: z.string(),
})

export const loginResponseSchema = z.object({ device_session_token: z.string() })

export const apiErrorTypeSchema = z.enum([
  'BadRequestException',
  'AuthenticationException',
  'NotFoundException',
  'TokenMismatchException',
  'ValidationException',
])

export const fieldErrorsSchema = z.record(z.string(), z.array(z.string()))

/** Lenient on purpose: only `message` is required, an unknown type or broken payload must not hide it. */
export const apiErrorBodySchema = z.object({
  error: z.object({
    type: apiErrorTypeSchema.optional().catch(undefined),
    message: z.string(),
    payload: fieldErrorsSchema.nullish().catch(null),
  }),
})

// Requests: the server's validation rules, mirrored so forms catch obvious mistakes before a round trip.
// The server stays authoritative: its 422 errors are still shown next to the fields.

export const loginPayloadSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'The email field is required.')
    .pipe(z.email('The email must be a valid email address.')),
  password: z.string().min(1, 'The password field is required.'),
})

export const webhookUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'The name field is required.')
    .max(255, 'The name may not be greater than 255 characters.'),
  url: z
    .string()
    .trim()
    .min(1, 'The url field is required.')
    .pipe(z.url({ protocol: /^https?$/, error: 'The url must be a valid URL.' })),
})
