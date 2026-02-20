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
import { formatDistanceToNow } from "date-fns";
import { Loader2, ChevronDown } from "lucide-react";

export default function ActivitiesPage() {
  const [page, setPage] = React.useState(1);
  const pageSize = 20;
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
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

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  const formatExecutionPlan = (raw: string) => {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  };

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
              {activities.map((activity) => (
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
