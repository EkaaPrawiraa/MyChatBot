"use client";

import React from "react";
import { AppSidebar } from "@/src/components/layout/app-sidebar";
import { SidebarHeaderToggle } from "@/src/components/layout/sidebar-header-toggle";
import { Footer } from "@/src/components/layout/footer";
import { ThemeToggle } from "@/src/components/layout/theme-toggle";
import { useActivities } from "@/src/hooks/use-activities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type PlanStep = {
  tool?: string;
  input?: any;
  success?: boolean;
  error?: string | null;
};

function safeJsonParse<T>(raw: string | undefined): T | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function formatDateTime(value: unknown): string {
  if (typeof value !== "string") return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString();
}

function summarizePlanStep(step: PlanStep): { title: string; lines: string[] } {
  const tool = String(step.tool || "(unknown tool)");
  const input = step.input || {};

  if (tool === "whatsapp.send") {
    const to = typeof input.to === "string" ? input.to : "";
    const message = typeof input.message === "string" ? input.message : "";
    return {
      title: "WhatsApp message",
      lines: [
        to ? `To: ${to}` : "",
        message ? `Message: ${message}` : "",
      ].filter(Boolean),
    };
  }

  if (tool === "people.search") {
    const query = typeof input.query === "string" ? input.query : "";
    const pageSize =
      typeof input.page_size === "number" ? String(input.page_size) : "";
    return {
      title: "Search contacts",
      lines: [
        query ? `Query: ${query}` : "",
        pageSize ? `Page size: ${pageSize}` : "",
      ].filter(Boolean),
    };
  }

  if (tool === "calendar.list") {
    const timeMin = typeof input.time_min === "string" ? input.time_min : "";
    const timeMax = typeof input.time_max === "string" ? input.time_max : "";
    return {
      title: "Calendar events",
      lines: [
        timeMin && timeMax
          ? `Range: ${formatDateTime(timeMin)} → ${formatDateTime(timeMax)}`
          : "",
      ].filter(Boolean),
    };
  }

  if (tool === "gmail.search") {
    const query = typeof input.query === "string" ? input.query : "";
    return {
      title: "Search email",
      lines: [query ? `Query: ${query}` : ""].filter(Boolean),
    };
  }

  if (tool === "gmail.send") {
    const to = typeof input.to === "string" ? input.to : "";
    const subject = typeof input.subject === "string" ? input.subject : "";
    return {
      title: "Send email",
      lines: [
        to ? `To: ${to}` : "",
        subject ? `Subject: ${subject}` : "",
      ].filter(Boolean),
    };
  }

  if (tool === "reminder.create") {
    const title = typeof input.title === "string" ? input.title : "";
    const scheduledAt =
      typeof input.scheduled_at === "string" ? input.scheduled_at : "";
    return {
      title: "Create reminder",
      lines: [
        title ? `Title: ${title}` : "",
        scheduledAt ? `When: ${formatDateTime(scheduledAt)}` : "",
      ].filter(Boolean),
    };
  }

  if (tool.startsWith("calendar.")) {
    const summary = typeof input.summary === "string" ? input.summary : "";
    const start = typeof input.start === "string" ? input.start : "";
    const end = typeof input.end === "string" ? input.end : "";
    const eventId = typeof input.event_id === "string" ? input.event_id : "";
    return {
      title: tool,
      lines: [
        summary ? `Title: ${summary}` : "",
        start ? `Start: ${formatDateTime(start)}` : "",
        end ? `End: ${formatDateTime(end)}` : "",
        eventId ? `Event: ${eventId}` : "",
      ].filter(Boolean),
    };
  }

  return { title: tool, lines: [] };
}

function PlanView({ raw }: { raw: string }) {
  const steps = safeJsonParse<PlanStep[]>(raw);
  if (!steps || !Array.isArray(steps) || steps.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No steps in this plan.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Flow</p>
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((s, idx) => (
            <React.Fragment key={`${String(s.tool)}-${idx}`}>
              <Badge variant="secondary" className="text-xs">
                {s.tool || "(unknown)"}
              </Badge>
              {idx < steps.length - 1 ? (
                <span className="text-xs text-muted-foreground">→</span>
              ) : null}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Steps</p>
        <div className="space-y-2">
          {steps.map((s, idx) => {
            const ok = s.success === true;
            const failed = s.success === false;
            const { title, lines } = summarizePlanStep(s);

            return (
              <div
                key={`${String(s.tool)}-${idx}-card`}
                className="rounded-lg border border-border bg-accent px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {title}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {s.tool}
                      </span>
                    </div>

                    {lines.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {lines.map((ln) => (
                          <div
                            key={ln}
                            className="text-xs text-muted-foreground"
                          >
                            {ln}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {s.error ? (
                      <div className="mt-2 text-xs text-red-400">{s.error}</div>
                    ) : null}
                  </div>

                  <Badge
                    variant={
                      ok ? "secondary" : failed ? "destructive" : "outline"
                    }
                    className={ok ? "" : failed ? "" : "border-primary/30"}
                  >
                    {ok ? "Valid" : failed ? "Invalid" : "Planned"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function PlanningPage() {
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  const { data: activities = [], isLoading: isLoadingActivities } =
    useActivities({
      page: 1,
      pageSize: 50,
    });

  const planActivities = React.useMemo(() => {
    return (activities || []).filter((a) => Boolean(a.executionPlan));
  }, [activities]);

  const toggleExpanded = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  return (
    <div className="flex h-screen">
      <AppSidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="bg-background border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <SidebarHeaderToggle className="mt-0.5" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold">Planning</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Visualize assistant plans from Activities
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto w-full space-y-4">
            {isLoadingActivities ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading…
              </div>
            ) : planActivities.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No activity plans yet. Once the agent logs activity, plans will
                appear here.
              </div>
            ) : (
              <div className="space-y-4">
                {planActivities.map((a) => (
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
                            {a.intent ? (
                              <Badge
                                variant="outline"
                                className="border-primary/30"
                              >
                                {a.intent}
                              </Badge>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(a.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(a.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${
                                expandedIds.has(a.id) ? "rotate-180" : ""
                              }`}
                            />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {expandedIds.has(a.id) ? (
                      <CardContent className="pt-0">
                        {a.executionPlan ? (
                          <PlanView raw={a.executionPlan} />
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No execution plan available.
                          </div>
                        )}
                      </CardContent>
                    ) : null}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <Footer className="flex-shrink-0" />
      </div>
    </div>
  );
}
