export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <nav className="container mx-auto flex items-center justify-between p-4">
          <h1 className="text-xl font-bold">folio</h1>
          <div className="flex gap-4">
            <a href="/login" className="text-sm hover:underline">
              Login
            </a>
            <a href="/register" className="text-sm hover:underline">
              Register
            </a>
          </div>
        </nav>
      </header>
      <main className="container mx-auto p-4">
        <h2 className="text-3xl font-bold mb-4">Your RSS Reader</h2>
        <p className="text-muted-foreground">
          AI-powered RSS reader with read-later functionality.
        </p>
      </main>
    </div>
  )
}
