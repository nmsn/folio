import { useQuery } from '@tanstack/react-query';
import { readingApi } from '@folio/api-client';

export function useReadingList() {
  return useQuery({
    queryKey: ['reading'],
    queryFn: () => readingApi.list(),
  });
}