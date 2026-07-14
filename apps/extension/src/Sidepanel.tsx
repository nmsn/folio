import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { orpc } from './orpc'

const queryClient = new QueryClient()

function FeedList() {
  const { data: feeds, isLoading, isError } = useQuery(orpc.feeds.list.queryOptions())

  if (isLoading) {
    return <p className="text-muted-foreground">Loading feeds...</p>
  }

  if (isError) {
    return <p className="text-muted-foreground">Failed to load feeds</p>
  }

  if (!feeds?.length) {
    return <p className="text-muted-foreground">No feeds yet</p>
  }

  return (
    <ul className="space-y-2">
      {feeds.map((feed) => (
        <li key={feed.id} className="text-sm">
          {feed.name}
        </li>
      ))}
    </ul>
  )
}

export function Sidepanel() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="w-full h-full bg-background text-foreground p-4">
        <h1 className="text-xl font-bold mb-4">folio</h1>
        <div id="feed-list">
          <FeedList />
        </div>
      </div>
    </QueryClientProvider>
  )
}
