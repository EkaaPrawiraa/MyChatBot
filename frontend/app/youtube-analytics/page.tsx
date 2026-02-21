"use client";

import React from "react";
import Link from "next/link";
import { Loader2, Youtube } from "lucide-react";
import { toast } from "sonner";

import { AppSidebar } from "@/src/components/layout/app-sidebar";
import { SidebarHeaderToggle } from "@/src/components/layout/sidebar-header-toggle";
import { Footer } from "@/src/components/layout/footer";
import { ThemeToggle } from "@/src/components/layout/theme-toggle";
import { useIntegrationsStatus } from "@/src/hooks/use-integrations";
import { useYouTubeAnalytics } from "@/src/hooks/use-youtube";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function safeNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatInt(n: number): string {
  try {
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return String(n);
  }
}

function formatDurationSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const s = Math.round(seconds);
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  if (mins <= 0) return `${rem}s`;
  return `${mins}m ${rem}s`;
}

function extractChannel(channels: any) {
  const item = channels?.items?.[0];
  const snippet = item?.snippet;
  const stats = item?.statistics;

  return {
    title: snippet?.title as string | undefined,
    description: snippet?.description as string | undefined,
    thumbnail:
      snippet?.thumbnails?.default?.url ||
      snippet?.thumbnails?.medium?.url ||
      snippet?.thumbnails?.high?.url,
    subscribers: safeNumber(stats?.subscriberCount),
    views: safeNumber(stats?.viewCount),
    videos: safeNumber(stats?.videoCount),
  };
}

function extractReportTotals(report: any) {
  const headers: Array<{ name?: string }> = report?.columnHeaders || [];
  const rows: any[] = report?.rows || [];
  const headerNames = headers.map((h) => String(h?.name || ""));

  const metricsIndex: Record<string, number> = {};
  headerNames.forEach((name, idx) => {
    metricsIndex[name] = idx;
  });

  const metrics = [
    "views",
    "estimatedMinutesWatched",
    "averageViewDuration",
    "subscribersGained",
    "subscribersLost",
  ];

  const totals: Record<string, number> = Object.fromEntries(
    metrics.map((m) => [m, 0]),
  );

  for (const row of rows) {
    for (const m of metrics) {
      const idx = metricsIndex[m];
      if (typeof idx === "number") {
        totals[m] += safeNumber(row?.[idx]);
      }
    }
  }

  return totals;
}

export default function YouTubeAnalyticsPage() {
  const { data: integrations, isLoading: isLoadingIntegrations } =
    useIntegrationsStatus();
  const isGoogleConnected = !!integrations?.google?.connected;

  const analytics = useYouTubeAnalytics();

  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  const data = analytics.data;
  const channel = extractChannel(data?.channels);
  const totals = extractReportTotals(data?.report);

  const onLoad = () => {
    const s = startDate.trim();
    const e = endDate.trim();
    if (!s || !e) return;

    analytics.mutate(
      { startDate: s, endDate: e },
      {
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Failed to load analytics",
          ),
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
                <div className="flex items-center gap-2">
                  <Youtube className="h-5 w-5 text-muted-foreground" />
                  <h1 className="text-2xl font-bold">YouTube Analytics</h1>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a date range, then load channel stats and a summary
                  report.
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6 max-w-5xl mx-auto w-full">
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
                      className="text-primary hover:underline"
                      href="/settings"
                    >
                      Settings
                    </Link>{" "}
                    to use YouTube Analytics.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="glass-dark relative overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-20 -left-16 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
                    <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
                  </div>

                  <CardHeader className="pb-4">
                    <CardTitle className="text-base">Load report</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Uses your connected Google account (channel==MINE).
                    </p>
                  </CardHeader>

                  <CardContent className="relative">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Start
                        </Label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          End
                        </Label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                      <div className="flex md:justify-end">
                        <Button
                          onClick={onLoad}
                          disabled={
                            analytics.isPending ||
                            !startDate.trim() ||
                            !endDate.trim()
                          }
                          className="w-full md:w-auto"
                        >
                          {analytics.isPending ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading…
                            </span>
                          ) : (
                            "Load"
                          )}
                        </Button>
                      </div>
                    </div>

                    {analytics.isError ? (
                      <p className="text-sm text-destructive mt-3">
                        {(analytics.error as any)?.message || "Request failed"}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>

                {data ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <Card className="glass-dark lg:col-span-5 overflow-hidden">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="text-base">Channel</CardTitle>
                          <Badge variant="secondary">
                            {data.startDate} → {data.endDate}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                          {channel.thumbnail ? (
                            <img
                              src={channel.thumbnail}
                              alt="Channel thumbnail"
                              className="h-12 w-12 rounded-lg border border-border"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg border border-border bg-muted/30" />
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {channel.title || "(unknown channel)"}
                            </div>
                            {channel.description ? (
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-3">
                                {channel.description}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-xl border border-border bg-card/30 p-3">
                            <div className="text-xs text-muted-foreground">
                              Subscribers
                            </div>
                            <div className="text-lg font-semibold">
                              {formatInt(channel.subscribers)}
                            </div>
                          </div>
                          <div className="rounded-xl border border-border bg-card/30 p-3">
                            <div className="text-xs text-muted-foreground">
                              Total views
                            </div>
                            <div className="text-lg font-semibold">
                              {formatInt(channel.views)}
                            </div>
                          </div>
                          <div className="rounded-xl border border-border bg-card/30 p-3">
                            <div className="text-xs text-muted-foreground">
                              Videos
                            </div>
                            <div className="text-lg font-semibold">
                              {formatInt(channel.videos)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-dark lg:col-span-7 overflow-hidden">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base">
                          Report summary
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Views, watch time, average view duration, and
                          subscriber changes.
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="rounded-xl border border-border bg-card/30 p-4">
                            <div className="text-xs text-muted-foreground">
                              Views
                            </div>
                            <div className="text-2xl font-semibold mt-1">
                              {formatInt(totals.views)}
                            </div>
                          </div>

                          <div className="rounded-xl border border-border bg-card/30 p-4">
                            <div className="text-xs text-muted-foreground">
                              Minutes watched
                            </div>
                            <div className="text-2xl font-semibold mt-1">
                              {formatInt(totals.estimatedMinutesWatched)}
                            </div>
                          </div>

                          <div className="rounded-xl border border-border bg-card/30 p-4">
                            <div className="text-xs text-muted-foreground">
                              Avg view duration
                            </div>
                            <div className="text-2xl font-semibold mt-1">
                              {formatDurationSeconds(
                                totals.averageViewDuration,
                              )}
                            </div>
                          </div>

                          <div className="rounded-xl border border-border bg-card/30 p-4">
                            <div className="text-xs text-muted-foreground">
                              Subscribers (gained / lost)
                            </div>
                            <div className="text-2xl font-semibold mt-1">
                              +{formatInt(totals.subscribersGained)} / -
                              {formatInt(totals.subscribersLost)}
                            </div>
                          </div>
                        </div>

                        <Accordion type="single" collapsible>
                          <AccordionItem value="raw">
                            <AccordionTrigger>Raw response</AccordionTrigger>
                            <AccordionContent>
                              <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words rounded-lg border border-border bg-card/30 p-3">
                                {JSON.stringify(data, null, 2)}
                              </pre>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </CardContent>
                    </Card>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        <Footer className="flex-shrink-0" />
      </div>
    </div>
  );
}
