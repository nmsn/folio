import { apiClient } from './client'
import { CreateRSSSourceSchema } from '@folio/shared/schemas'

export const feedsApi = {
  list: () => apiClient.get('/feeds'),

  get: (id: string) => apiClient.get(`/feeds/${id}`),

  create: (input: unknown) => {
    const parsed = CreateRSSSourceSchema.parse(input)
    return apiClient.post('/feeds', parsed)
  },

  update: (id: string, input: unknown) => {
    const parsed = CreateRSSSourceSchema.parse(input)
    return apiClient.patch(`/feeds/${id}`, parsed)
  },

  delete: (id: string) => apiClient.delete(`/feeds/${id}`),

  refresh: (id: string) => apiClient.post(`/feeds/${id}/refresh`, {}),
}
