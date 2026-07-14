import { apiClient } from './client'
import { UpdateReadingItemSchema } from '@folio/shared/schemas'

export const readingApi = {
  list: (limit = 50, offset = 0) => apiClient.get(`/reading?limit=${limit}&offset=${offset}`),

  byStatus: (status: string, limit = 50, offset = 0) =>
    apiClient.get(`/reading/status/${status}?limit=${limit}&offset=${offset}`),

  get: (id: string) => apiClient.get(`/reading/${id}`),

  create: (articleId: string) => {
    return apiClient.post('/reading', { articleId })
  },

  update: (id: string, input: unknown) => {
    const parsed = UpdateReadingItemSchema.parse(input)
    return apiClient.patch(`/reading/${id}`, parsed)
  },

  delete: (id: string) => apiClient.delete(`/reading/${id}`),

  markAsRead: (id: string) => apiClient.post(`/reading/${id}/read`, {}),

  markAsSaved: (id: string) => apiClient.post(`/reading/${id}/save`, {}),
}
