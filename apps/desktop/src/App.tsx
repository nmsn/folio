import { useQuery } from '@tanstack/react-query'
import { orpc } from './orpc'

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

export function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b p-4">
        <nav className="flex justify-between items-center">
          <h1 className="text-xl font-bold">folio Desktop</h1>
        </nav>
      </header>
      <main className="container mx-auto p-4">
        <FeedList />
      </main>
    </div>
  )
}
