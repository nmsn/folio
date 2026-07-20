import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orpc, client } from '../lib/orpc'

export function useFeeds() {
  return useQuery(orpc.feeds.list.queryOptions())
}

export function useCreateFeed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { url: string; name?: string; description?: string; category?: string }) =>
      client.feeds.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.feeds.key() })
      queryClient.invalidateQueries({ queryKey: orpc.articles.key() })
    },
  })
}

export function useRefreshFeed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (feedId: string) => client.feeds.refresh({ id: feedId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.feeds.key() })
      queryClient.invalidateQueries({ queryKey: orpc.articles.key() })
    },
  })
}

export function useDeleteFeed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (feedId: string) => client.feeds.delete({ id: feedId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.feeds.key() })
    },
  })
}
