import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { feedsApi } from '@folio/api-client';

const queryClient = new QueryClient();

export function Sidepanel() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="w-full h-full bg-background text-foreground p-4">
        <h1 className="text-xl font-bold mb-4">folio</h1>
        <div id="feed-list">
          <p className="text-muted-foreground">Loading feeds...</p>
        </div>
      </div>
    </QueryClientProvider>
  );
}