"use client";

import React from "react";
import { AppSidebar } from "@/src/components/layout/app-sidebar";
import { SidebarHeaderToggle } from "@/src/components/layout/sidebar-header-toggle";
import { Footer } from "@/src/components/layout/footer";
import { ThemeToggle } from "@/src/components/layout/theme-toggle";
import { useIntegrationsStatus } from "@/src/hooks/use-integrations";
import {
  useGmailCategorizedUnread,
  useGmailSearch,
  useGmailSend,
} from "@/src/hooks/use-gmail";
import { useActivities } from "@/src/hooks/use-activities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";

function headerValue(
  headers: Array<{ name: string; value: string }> | undefined,
  key: string,
): string {
  if (!headers) return "";
  const found = headers.find(
    (h) => (h.name || "").toLowerCase() === key.toLowerCase(),
  );
  return found?.value || "";
}

export default function EmailPage() {
  const { data: integrations, isLoading: isLoadingIntegrations } =
    useIntegrationsStatus();

  const isGoogleConnected = !!integrations?.google?.connected;

  const { data: categorized, isLoading: isLoadingCategorized } =
    useGmailCategorizedUnread(5);
  const search = useGmailSearch();
  const send = useGmailSend();

  const [searchQuery, setSearchQuery] = React.useState(
    "category:primary is:unread",
  );
  const [to, setTo] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");

  const { data: activities = [], isLoading } = useActivities({
    page: 1,
    pageSize: 50,
  });

  const emailActivities = React.useMemo(() => {
    return (activities || []).filter((a) =>
      (a.tools || []).some((t) => t.startsWith("gmail.")),
    );
  }, [activities]);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <AppSidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="bg-background border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <SidebarHeaderToggle className="mt-0.5" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold">Email</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Recent email-related activity (job/employment)
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {!isLoadingIntegrations && !isGoogleConnected ? (
            <div className="max-w-4xl mx-auto w-full">
              <Card className="glass-dark">
                <CardHeader>
                  <CardTitle className="text-base">
                    Google not connected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Connect Google in{" "}
                    <Link
                      href="/settings"
                      className="text-primary hover:underline"
                    >
                      Settings
                    </Link>{" "}
                    to use Gmail.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {isGoogleConnected ? (
            <div className="max-w-4xl mx-auto w-full grid grid-cols-1 gap-4">
              <Card className="glass-dark">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Inbox categories (unread)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingCategorized ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading…
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {Object.entries(categorized?.categories || {}).map(
                        ([key, val]) => (
                          <div
                            key={key}
                            className="rounded-lg border border-border bg-card/40 px-3 py-2"
                          >
                            <div className="text-xs text-muted-foreground capitalize">
                              {key}
                            </div>
                            <div className="text-sm font-medium">
                              {val?.count ?? 0}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">
                    Tip: use queries like{" "}
                    <span className="font-mono">
                      category:social newer_than:7d
                    </span>
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-dark">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Search Gmail</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. from:linkedin category:social newer_than:30d"
                    />
                    <Button
                      onClick={() =>
                        search.mutate(
                          { query: searchQuery, maxResults: 10 },
                          {
                            onError: (err) =>
                              toast.error(
                                err instanceof Error
                                  ? err.message
                                  : "Search failed",
                              ),
                          },
                        )
                      }
                      disabled={search.isPending || !searchQuery.trim()}
                    >
                      {search.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Search"
                      )}
                    </Button>
                  </div>

                  {search.data?.messages?.length ? (
                    <div className="space-y-2">
                      {search.data.messages.map((m) => {
                        const headers = m.payload?.headers;
                        const subject =
                          headerValue(headers, "Subject") || "(No subject)";
                        const from = headerValue(headers, "From");
                        const date = headerValue(headers, "Date");
                        return (
                          <div
                            key={m.id}
                            className="rounded-lg border border-border bg-card/40 px-3 py-2"
                          >
                            <div className="text-sm font-medium truncate">
                              {subject}
                            </div>
                            <div className="text-xs text-muted-foreground truncate mt-1">
                              {from ? `From: ${from}` : null}
                              {from && date ? " • " : null}
                              {date || null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : search.data ? (
                    <p className="text-sm text-muted-foreground">No results.</p>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="glass-dark">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Compose</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="To"
                  />
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject"
                  />
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Email body"
                    className="min-h-24"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={() =>
                        send.mutate(
                          { to, subject, body },
                          {
                            onSuccess: () => {
                              toast.success("Email sent");
                              setSubject("");
                              setBody("");
                            },
                            onError: (err) =>
                              toast.error(
                                err instanceof Error
                                  ? err.message
                                  : "Send failed",
                              ),
                          },
                        )
                      }
                      disabled={send.isPending || !to.trim()}
                    >
                      {send.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Send"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : emailActivities.length === 0 ? (
            <div className="text-center text-muted-foreground py-20">
              <p className="text-lg font-medium mb-2">No email activity yet</p>
              <p className="text-sm">
                Gmail actions will show up here once the agent uses gmail.*
                tools
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto w-full">
              {emailActivities.map((a) => (
                <Card
                  key={a.id}
                  className="glass-dark transition-colors hover:bg-accent/40"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-base">{a.query}</CardTitle>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge
                            variant={a.success ? "secondary" : "destructive"}
                          >
                            {a.success ? "Success" : "Failed"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-primary/30"
                          >
                            Gmail
                          </Badge>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(a.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm text-muted-foreground">
                      Tools: {(a.tools || []).join(", ") || "(none)"}
                    </div>
                    {a.error ? (
                      <div className="mt-2 text-sm text-destructive">
                        {a.error}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Footer className="flex-shrink-0" />
      </div>
    </div>
  );
}
