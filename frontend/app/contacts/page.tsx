"use client";

import React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { AppSidebar } from "@/src/components/layout/app-sidebar";
import { SidebarHeaderToggle } from "@/src/components/layout/sidebar-header-toggle";
import { Footer } from "@/src/components/layout/footer";
import { ThemeToggle } from "@/src/components/layout/theme-toggle";
import { useIntegrationsStatus } from "@/src/hooks/use-integrations";
import { usePeopleSearch } from "@/src/hooks/use-people";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

function displayNameFromResult(result: unknown): string {
  const r = result as {
    person?: { names?: Array<{ displayName?: string }> };
  };
  return r.person?.names?.[0]?.displayName || "(No name)";
}

function phoneNumbersFromResult(result: unknown): string[] {
  const r = result as {
    person?: {
      phoneNumbers?: Array<{ value?: string; canonicalForm?: string }>;
    };
  };
  const nums = r.person?.phoneNumbers || [];
  return nums
    .map((n) => n.canonicalForm || n.value)
    .filter((v): v is string => Boolean(v && v.trim()));
}

export default function ContactsPage() {
  const { data: integrations, isLoading: isLoadingIntegrations } =
    useIntegrationsStatus();
  const isGoogleConnected = !!integrations?.google?.connected;

  const peopleSearch = usePeopleSearch();
  const [query, setQuery] = React.useState("");

  const results = peopleSearch.data?.results || [];

  const onSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    peopleSearch.mutate(
      { query: trimmed, pageSize: 50 },
      {
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Search failed"),
      },
    );
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <AppSidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="bg-background border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <SidebarHeaderToggle className="mt-0.5" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold">Contacts</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Google contacts (names + phone numbers)
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6 max-w-4xl mx-auto w-full">
            {!isLoadingIntegrations && !isGoogleConnected ? (
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
                    to view contacts.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <Card className="glass-dark">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Search Contacts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name or phone"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onSearch();
                    }}
                    disabled={!isGoogleConnected}
                  />
                  <Button
                    onClick={onSearch}
                    disabled={
                      !isGoogleConnected ||
                      peopleSearch.isPending ||
                      !query.trim()
                    }
                  >
                    {peopleSearch.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Search"
                    )}
                  </Button>
                </div>

                {isLoadingIntegrations ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading…
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {peopleSearch.data ? (
              <Card className="glass-dark">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Results ({results.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {results.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No contacts found.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {results.map((r, idx) => {
                        const name = displayNameFromResult(r);
                        const phones = phoneNumbersFromResult(r);
                        return (
                          <div
                            key={
                              (r as { person?: { resourceName?: string } })
                                .person?.resourceName || String(idx)
                            }
                            className="rounded-lg border border-border bg-card/40 px-3 py-2"
                          >
                            <div className="text-sm font-medium truncate">
                              {name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {phones.length
                                ? phones.join(" • ")
                                : "No phone number"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>

        <Footer className="flex-shrink-0" />
      </div>
    </div>
  );
}
