export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you’re looking for doesn’t exist.
        </p>
        <a
          href="/chat"
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Go to chat
        </a>
      </div>
    </div>
  );
}
