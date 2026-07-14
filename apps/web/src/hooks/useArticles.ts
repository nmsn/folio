import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orpc } from '../lib/orpc'

export function useArticles(sourceId?: string) {
  return useQuery({
    ...orpc.articles.bySource.queryOptions({
      input: { sourceId: sourceId!, limit: 20, offset: 0 },
    }),
    enabled: !!sourceId,
  })
}

export function useArticle(id: string) {
  return useQuery({
    ...orpc.articles.get.queryOptions({ input: { id } }),
    enabled: !!id,
  })
}

export function useRefreshArticles() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: orpc.articles.key() })
  }
}
