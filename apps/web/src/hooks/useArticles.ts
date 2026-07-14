import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { articlesApi } from '@folio/api-client'

export function useArticles(sourceId?: string) {
  return useQuery({
    queryKey: sourceId ? ['articles', sourceId] : ['articles'],
    queryFn: () => {
      if (sourceId) {
        return articlesApi.bySource(sourceId) as Promise<any[]>
      }
      return Promise.resolve([])
    },
  })
}

export function useArticle(id: string) {
  return useQuery({
    queryKey: ['article', id],
    queryFn: () => articlesApi.get(id) as Promise<any>,
    enabled: !!id,
  })
}
