import { useQuery } from '@tanstack/react-query'
import { orpc } from '../api/orpc'

export function useReadingList() {
  return useQuery(orpc.reading.list.queryOptions({ input: { limit: 50, offset: 0 } }))
}
