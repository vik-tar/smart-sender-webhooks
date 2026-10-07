import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { formError } from '../../../api/errors'
import { webhookUpdateSchema } from '../../../api/schemas'
import type { Webhook } from '../../../api/types'
import { Field } from '../../../components/Field'
import { setServerErrors } from '../../../lib/form'
import { useUpdateWebhook } from '../api/queries'

const FIELDS = ['name', 'url'] as const

interface WebhookFormProps {
  webhook: Webhook
  onDone: () => void
}

/** noValidate: the zod schema replaces browser validation, so messages look the same as the server's 422. */
export function WebhookForm({ webhook, onDone }: WebhookFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(webhookUpdateSchema),
    defaultValues: { name: webhook.name, url: webhook.url },
  })
  const mutation = useUpdateWebhook(webhook.id)

  const onSubmit = handleSubmit((values) =>
    mutation.mutate(values, {
      onSuccess: onDone,
      onError: (error) => setServerErrors(error, FIELDS, setError),
    }),
  )

  const formAlert = formError(mutation.error, FIELDS)
  return (
    <form onSubmit={onSubmit} noValidate>
      {formAlert && (
        <p role="alert" className="form-error">
          {formAlert}
        </p>
      )}
      <Field label="Name" {...register('name')} error={errors.name?.message} />
      <Field label="URL" type="url" {...register('url')} error={errors.url?.message} />
      <div className="form-actions">
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}
