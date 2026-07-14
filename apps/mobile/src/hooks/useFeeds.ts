import { useQuery } from '@tanstack/react-query'
import { orpc } from '../api/orpc'

export function useFeeds() {
  return useQuery(orpc.feeds.list.queryOptions())
}
