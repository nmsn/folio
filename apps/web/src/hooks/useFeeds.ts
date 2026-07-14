import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { feedsApi } from '@folio/api-client'

export function useFeeds() {
  return useQuery({
    queryKey: ['feeds'],
    queryFn: () => feedsApi.list() as Promise<any[]>,
  })
}

export function useCreateFeed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; url: string }) => feedsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
  })
}

export function useRefreshFeed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (feedId: string) => feedsApi.refresh(feedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    },
  })
}

export function useDeleteFeed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (feedId: string) => feedsApi.delete(feedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
  })
}
