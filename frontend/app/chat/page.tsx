import { Suspense } from "react";
import ChatPageClient from "./chat-page-client";

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background text-foreground">
          <p className="text-sm text-muted-foreground">Loading chat…</p>
        </div>
      }
    >
      <ChatPageClient />
    </Suspense>
  );
}
