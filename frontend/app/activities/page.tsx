"use client";

import React from "react";
import { useActivities } from "@/src/hooks/use-activities";
import { AppSidebar } from "@/src/components/layout/app-sidebar";
import { SidebarHeaderToggle } from "@/src/components/layout/sidebar-header-toggle";
import { Footer } from "@/src/components/layout/footer";
import { ThemeToggle } from "@/src/components/layout/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { Loader2, ChevronDown } from "lucide-react";

type ExecutionStep = {
  tool?: string;
  input?: any;
  result?: any;
  success?: boolean;
  error?: string | null;
};

type FlowCategory =
  | "all"
  | "whatsapp"
  | "gmail"
  | "calendar"
  | "contacts"
  | "drive"
  | "reminder"
  | "memory"
  | "youtube"
  | "other";

type StatusFilter = "all" | "success" | "failed";

function getFlowCategoryFromTools(tools: string[] | undefined): FlowCategory {
  const list = (tools || []).map((t) => String(t || "").toLowerCase());
  if (list.some((t) => t.startsWith("whatsapp."))) return "whatsapp";
  if (list.some((t) => t.startsWith("gmail."))) return "gmail";
  if (list.some((t) => t.startsWith("calendar."))) return "calendar";
  if (list.some((t) => t.startsWith("people."))) return "contacts";
  if (list.some((t) => t.startsWith("drive."))) return "drive";
  if (list.some((t) => t.startsWith("reminder."))) return "reminder";
  if (list.some((t) => t.startsWith("memory."))) return "memory";
  if (list.some((t) => t.startsWith("youtube."))) return "youtube";
  return "other";
}

function safeJsonParse<T>(raw: string | undefined): T | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function prettyJson(raw: string | undefined): string {
  if (!raw) return "";
  const parsed = safeJsonParse<unknown>(raw);
  if (!parsed) return raw;
  return JSON.stringify(parsed, null, 2);
}

function formatDateTime(value: unknown): string {
  if (typeof value !== "string") return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString();
}

function summarizeStep(step: ExecutionStep): {
  title: string;
  lines: string[];
} {
  const tool = String(step.tool || "(unknown tool)");
  const input = step.input || {};
  const result = step.result || {};

  if (tool === "whatsapp.send") {
    const to = typeof input.to === "string" ? input.to : "";
    const message = typeof input.message === "string" ? input.message : "";
    const ok = typeof result.ok === "boolean" ? result.ok : undefined;
    return {
      title: "WhatsApp message",
      lines: [
        to ? `To: ${to}` : "",
        message ? `Message: ${message}` : "",
        ok === true ? "Result: sent" : ok === false ? "Result: failed" : "",
      ].filter(Boolean),
    };
  }

  if (tool === "calendar.list") {
    const timeMin = typeof input.time_min === "string" ? input.time_min : "";
    const timeMax = typeof input.time_max === "string" ? input.time_max : "";
    const items = Array.isArray(result.items) ? result.items : [];
    const firstSummary =
      items.length > 0 && typeof items[0]?.summary === "string"
        ? String(items[0].summary)
        : "";
    return {
      title: "Calendar events",
      lines: [
        timeMin && timeMax
          ? `Range: ${formatDateTime(timeMin)} → ${formatDateTime(timeMax)}`
          : "",
        `Found: ${items.length} event(s)`,
        firstSummary ? `First: ${firstSummary}` : "",
      ].filter(Boolean),
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

  if (tool.startsWith("calendar.")) {
    const summary = typeof input.summary === "string" ? input.summary : "";
    const start = typeof input.start === "string" ? input.start : "";
    const end = typeof input.end === "string" ? input.end : "";
    return {
      title: tool,
      lines: [
        summary ? `Title: ${summary}` : "",
        start ? `Start: ${formatDateTime(start)}` : "",
        end ? `End: ${formatDateTime(end)}` : "",
      ].filter(Boolean),
    };
  }

  return {
    title: tool,
    lines: [],
  };
}

function ExecutionResultsView({ raw }: { raw: string }) {
  const steps = safeJsonParse<ExecutionStep[]>(raw);
  if (!steps || !Array.isArray(steps) || steps.length === 0) {
    return (
      <pre className="bg-muted border border-border rounded p-3 text-xs overflow-x-auto text-foreground">
        {prettyJson(raw)}
      </pre>
    );
  }

  return (
    <div className="space-y-4">
      {/* Simple flow graph */}
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

      {/* Step cards */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Steps</p>
        <div className="space-y-2">
          {steps.map((s, idx) => {
            const ok = s.success === true;
            const failed = s.success === false;
            const { title, lines } = summarizeStep(s);

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
                    {ok ? "Success" : failed ? "Failed" : "Unknown"}
                  </Badge>
                </div>

                {/* Raw payload fallback (still useful for debugging) */}
                <details className="mt-3">
                  <summary className="text-xs text-muted-foreground cursor-pointer select-none">
                    Raw JSON
                  </summary>
                  <pre className="mt-2 bg-muted border border-border rounded p-3 text-xs overflow-x-auto text-foreground">
                    {prettyJson(JSON.stringify(s))}
                  </pre>
                </details>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ActivitiesPage() {
  const [page, setPage] = React.useState(1);
  const pageSize = 20;
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [flowFilter, setFlowFilter] = React.useState<FlowCategory>("all");
  const { data: activitiesPage = [], isLoading } = useActivities({
    page,
    pageSize,
  });

  const [activities, setActivities] = React.useState<typeof activitiesPage>([]);

  React.useEffect(() => {
    if (!activitiesPage) return;
    if (page === 1) {
      setActivities(activitiesPage);
      return;
    }

    setActivities((prev) => {
      const seen = new Set(prev.map((a) => a.id));
      const next = [...prev];
      for (const a of activitiesPage) {
        if (!seen.has(a.id)) next.push(a);
      }
      return next;
    });
  }, [activitiesPage, page]);

  const hasMore = activitiesPage.length === pageSize;

  const filteredActivities = React.useMemo(() => {
    return (activities || []).filter((a) => {
      const statusOk =
        statusFilter === "all"
          ? true
          : statusFilter === "success"
            ? a.success === true
            : a.success === false;

      const flow = getFlowCategoryFromTools(a.tools);
      const flowOk = flowFilter === "all" ? true : flow === flowFilter;

      return statusOk && flowOk;
    });
  }, [activities, statusFilter, flowFilter]);

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  const formatExecutionPlan = (raw: string) => prettyJson(raw);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="bg-background border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <SidebarHeaderToggle className="mt-0.5" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold">Activities</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  View and manage recent assistant activities
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center text-muted-foreground py-20">
              <p className="text-lg font-medium mb-2">No activities yet</p>
              <p className="text-sm">
                Activities will appear here as you interact with the assistant
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto w-full">
              <Card className="glass-dark">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Status
                      </span>
                      <Select
                        value={statusFilter}
                        onValueChange={(v) =>
                          setStatusFilter(v as StatusFilter)
                        }
                      >
                        <SelectTrigger size="sm" className="w-[160px]">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Flow
                      </span>
                      <Select
                        value={flowFilter}
                        onValueChange={(v) => setFlowFilter(v as FlowCategory)}
                      >
                        <SelectTrigger size="sm" className="w-[180px]">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="gmail">Gmail</SelectItem>
                          <SelectItem value="calendar">Calendar</SelectItem>
                          <SelectItem value="contacts">Contacts</SelectItem>
                          <SelectItem value="drive">Drive</SelectItem>
                          <SelectItem value="reminder">Reminder</SelectItem>
                          <SelectItem value="memory">Memory</SelectItem>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStatusFilter("all");
                        setFlowFilter("all");
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {filteredActivities.map((activity) => (
                <Card
                  key={activity.id}
                  className="glass-dark transition-colors hover:bg-accent/40"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          {activity.query}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge
                            variant={
                              activity.success ? "secondary" : "destructive"
                            }
                          >
                            {activity.success ? "Success" : "Failed"}
                          </Badge>
                          {activity.intent && (
                            <Badge
                              variant="outline"
                              className="border-primary/30"
                            >
                              {activity.intent}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {activity.latency}ms
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  {expandedIds.has(activity.id) && (
                    <CardContent className="border-t border-border pt-4">
                      {activity.tools && activity.tools.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-muted-foreground mb-2">
                            Tools Used
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {activity.tools.map((tool) => (
                              <Badge
                                key={tool}
                                variant="secondary"
                                className="text-xs"
                              >
                                {tool}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {activity.executionResults && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-muted-foreground mb-2">
                            Execution Results
                          </p>
                          <ExecutionResultsView
                            raw={activity.executionResults}
                          />
                        </div>
                      )}

                      {activity.executionPlan && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-muted-foreground mb-2">
                            Execution Plan
                          </p>
                          <pre className="bg-muted border border-border rounded p-3 text-xs overflow-x-auto text-foreground">
                            {formatExecutionPlan(activity.executionPlan)}
                          </pre>
                        </div>
                      )}

                      {activity.error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
                          <p className="text-sm text-red-400">
                            {activity.error}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  )}

                  <div className="px-6 py-3 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => toggleExpanded(activity.id)}
                    >
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${expandedIds.has(activity.id) ? "rotate-180" : ""}`}
                      />
                      {expandedIds.has(activity.id)
                        ? "Show Less"
                        : "Show Details"}
                    </Button>
                  </div>
                </Card>
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    className="border-border hover:bg-accent"
                  >
                    Load More
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <Footer className="flex-shrink-0" />
      </div>
    </div>
  );
}
