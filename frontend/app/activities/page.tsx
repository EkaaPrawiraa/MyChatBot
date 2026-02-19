"use client";

import React from "react";
import { useActivities } from "@/src/hooks/use-activities";
import { AppLayout } from "@/src/components/layout/app-layout";
import { Sidebar } from "@/src/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Loader2, ChevronDown } from "lucide-react";

export default function ActivitiesPage() {
  const [page, setPage] = React.useState(1);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const { data: activitiesData, isLoading } = useActivities({
    page,
    pageSize: 20,
  });

  const activities = activitiesData?.activities || [];
  const total = activitiesData?.total || 0;

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="hidden lg:flex w-[280px] flex-col flex-shrink-0 border-r border-white/10">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="glass-dark border-b border-white/10 px-6 py-4">
          <h1 className="text-2xl font-bold">Activities</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage recent assistant activities
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-accent-glow-bright" />
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center text-muted-foreground py-20">
              <p className="text-lg font-medium mb-2">No activities yet</p>
              <p className="text-sm">
                Activities will appear here as you interact with the assistant
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl">
              {activities.map((activity) => (
                <Card
                  key={activity.id}
                  className="glass-dark border-white/10 hover:border-white/20 transition-colors"
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
                              className="border-accent-glow-bright/30"
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
                    <CardContent className="border-t border-white/10 pt-4">
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
                          <pre className="bg-black/40 rounded p-3 text-xs overflow-x-auto text-foreground">
                            {JSON.stringify(
                              JSON.parse(activity.executionPlan),
                              null,
                              2,
                            )}
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

                  <div className="px-6 py-3 border-t border-white/10">
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
              {activities.length < total && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    className="border-white/10 hover:bg-white/5"
                  >
                    Load More
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
