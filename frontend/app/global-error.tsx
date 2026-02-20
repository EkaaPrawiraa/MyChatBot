"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Application error</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Something went wrong at the app root.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
