import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../api'
import type { WebhookListParams, WebhookUpdate } from '../../../api/types'

export const webhookKeys = {
  all: ['webhooks'] as const,
  lists: () => [...webhookKeys.all, 'list'] as const,
  list: (params: WebhookListParams) => [...webhookKeys.lists(), params] as const,
  detail: (id: number) => [...webhookKeys.all, 'detail', id] as const,
}

export function useWebhooksList(params: WebhookListParams) {
  return useQuery({
    queryKey: webhookKeys.list(params),
    queryFn: ({ signal }) => api.listWebhooks(params, signal),
    placeholderData: keepPreviousData, // keep the table while the next page loads
  })
}

export function useWebhook(id: number) {
  return useQuery({
    queryKey: webhookKeys.detail(id),
    queryFn: ({ signal }) => api.getWebhook(id, signal),
    enabled: Number.isInteger(id) && id > 0,
  })
}

export function useUpdateWebhook(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: WebhookUpdate) => api.updateWebhook(id, data),
    onSuccess: async (webhook) => {
      queryClient.setQueryData(webhookKeys.detail(id), webhook)
      await queryClient.invalidateQueries({ queryKey: webhookKeys.lists() })
    },
  })
}
