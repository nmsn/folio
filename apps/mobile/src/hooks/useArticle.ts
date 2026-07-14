import { useQuery } from '@tanstack/react-query'
import { articlesApi } from '@folio/api-client'

export function useArticle(id: string) {
  return useQuery({
    queryKey: ['articles', id],
    queryFn: () => articlesApi.get(id),
    enabled: !!id,
  })
}
