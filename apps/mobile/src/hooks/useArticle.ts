import { useQuery } from '@tanstack/react-query'
import { orpc } from '../api/orpc'

export function useArticle(id: string) {
  return useQuery({
    ...orpc.articles.get.queryOptions({ input: { id } }),
    enabled: !!id,
  })
}
