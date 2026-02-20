"use client";

import React from "react";
import { AppSidebar } from "@/src/components/layout/app-sidebar";
import { SidebarHeaderToggle } from "@/src/components/layout/sidebar-header-toggle";
import { Footer } from "@/src/components/layout/footer";
import { ThemeToggle } from "@/src/components/layout/theme-toggle";
import { useActivities } from "@/src/hooks/use-activities";
import { useApprovals } from "@/src/hooks/use-approvals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ViewMode = "activities" | "approvals";

function prettyJson(raw?: string) {
  if (!raw) return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export default function PlanningPage() {
  const [view, setView] = React.useState<ViewMode>("activities");
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  const { data: activities = [], isLoading: isLoadingActivities } =
    useActivities({
      page: 1,
      pageSize: 50,
    });

  const { data: approvals = [], isLoading: isLoadingApprovals } =
    useApprovals();

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
                  Visualize assistant plans from Activities and Approvals
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto w-full space-y-4">
            <div className="flex items-center gap-2">
              <Button
                variant={view === "activities" ? "default" : "secondary"}
                onClick={() => setView("activities")}
                className={
                  view === "activities"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : ""
                }
              >
                Activities
              </Button>
              <Button
                variant={view === "approvals" ? "default" : "secondary"}
                onClick={() => setView("approvals")}
                className={
                  view === "approvals"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : ""
                }
              >
                Approvals
              </Button>
            </div>

            {view === "activities" ? (
              <div>
                {isLoadingActivities ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading…
                  </div>
                ) : planActivities.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No activity plans yet. Once the agent logs activity, plans
                    will appear here.
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
                              <CardTitle className="text-base">
                                {a.query}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <Badge
                                  variant={
                                    a.success ? "secondary" : "destructive"
                                  }
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
                            <pre className="text-xs bg-muted rounded-md p-4 overflow-auto border border-border">
                              {prettyJson(a.executionPlan)}
                            </pre>
                          </CardContent>
                        ) : null}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {isLoadingApprovals ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading…
                  </div>
                ) : approvals.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No approvals yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {approvals.map((a) => (
                      <Card
                        key={a.id}
                        className="glass-dark transition-colors hover:bg-accent/40"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <CardTitle className="text-base">
                                Approval
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className="border-primary/30"
                                >
                                  {a.status}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="border-primary/30"
                                >
                                  {a.steps.length} step(s)
                                </Badge>
                              </div>
                            </div>
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
                        </CardHeader>
                        {expandedIds.has(a.id) ? (
                          <CardContent className="pt-0">
                            <pre className="text-xs bg-muted rounded-md p-4 overflow-auto border border-border">
                              {prettyJson(a.proposedPlan)}
                            </pre>
                          </CardContent>
                        ) : null}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Footer className="flex-shrink-0" />
      </div>
    </div>
  );
}
