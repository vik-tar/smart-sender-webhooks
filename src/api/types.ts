import type { z } from 'zod'
import type {
  apiErrorTypeSchema,
  fieldErrorsSchema,
  loginPayloadSchema,
  meSchema,
  webhookListSchema,
  webhookSchema,
  webhookUpdateSchema,
} from './schemas'

// Contract types are inferred from the schemas, so the runtime check and the type can't drift apart.

export type Webhook = z.infer<typeof webhookSchema>
export type WebhookList = z.infer<typeof webhookListSchema>
export type Me = z.infer<typeof meSchema>
export type LoginPayload = z.infer<typeof loginPayloadSchema>
export type WebhookUpdate = z.infer<typeof webhookUpdateSchema>
export type ApiErrorType = z.infer<typeof apiErrorTypeSchema>
export type FieldErrors = z.infer<typeof fieldErrorsSchema>

export interface WebhookListParams {
  page: number
  search: string
}
