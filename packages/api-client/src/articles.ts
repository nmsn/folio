import { apiClient } from './client'

export const articlesApi = {
  get: (id: string) => apiClient.get(`/articles/${id}`),

  bySource: (sourceId: string, limit = 20, offset = 0) =>
    apiClient.get(`/articles/source/${sourceId}?limit=${limit}&offset=${offset}`),
}
