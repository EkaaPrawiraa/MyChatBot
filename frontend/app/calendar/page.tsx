"use client";

import React from "react";
import Link from "next/link";
import { addDays } from "date-fns";
import { AppSidebar } from "@/src/components/layout/app-sidebar";
import { SidebarHeaderToggle } from "@/src/components/layout/sidebar-header-toggle";
import { Footer } from "@/src/components/layout/footer";
import { ThemeToggle } from "@/src/components/layout/theme-toggle";
import { useCalendarEvents } from "@/src/hooks/use-calendar";
import { calendarService } from "@/src/services/calendar-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function toRFC3339(date: Date): string {
  return date.toISOString();
}

function formatWhen(evt: { start: string; allDay?: boolean }) {
  if (!evt.start) return "";
  if (evt.allDay) return evt.start;
  return new Date(evt.start).toLocaleString();
}

export default function CalendarPage() {
  const now = React.useMemo(() => new Date(), []);
  const timeMin = React.useMemo(() => toRFC3339(now), [now]);
  const timeMax = React.useMemo(() => toRFC3339(addDays(now, 7)), [now]);

  const {
    data: events = [],
    isLoading,
    error,
    refetch,
  } = useCalendarEvents({ timeMin, timeMax, maxResults: 50 });

  const [title, setTitle] = React.useState("");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [createMeet, setCreateMeet] = React.useState(true);
  const [isCreating, setIsCreating] = React.useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !start.trim() || !end.trim()) {
      toast.error("Title, start, and end are required");
      return;
    }

    setIsCreating(true);
    try {
      await calendarService.createEvent({
        summary: title,
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        create_meet: createMeet,
      });
      toast.success("Event created");
      setTitle("");
      setStart("");
      setEnd("");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRename = async (eventId: string, currentTitle: string) => {
    const next = window.prompt("New title", currentTitle);
    if (next === null) return;
    if (!next.trim()) {
      toast.error("Title cannot be empty");
      return;
    }
    try {
      await calendarService.updateEvent(eventId, { summary: next.trim() });
      toast.success("Event updated");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleDelete = async (eventId: string) => {
    const ok = window.confirm("Delete this event?");
    if (!ok) return;
    try {
      await calendarService.deleteEvent(eventId);
      toast.success("Event deleted");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const errorMessage = error instanceof Error ? error.message : "";

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <AppSidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="bg-background border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <SidebarHeaderToggle className="mt-0.5" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold">Calendar</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Upcoming events (next 7 days)
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div className="max-w-4xl mx-auto w-full">
            <Card className="glass-dark">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Create event</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Start
                    </label>
                    <Input
                      type="datetime-local"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">End</label>
                    <Input
                      type="datetime-local"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Google Meet link</p>
                    <p className="text-xs text-muted-foreground">
                      Adds a Meet link to the event.
                    </p>
                  </div>
                  <Switch
                    checked={createMeet}
                    onCheckedChange={setCreateMeet}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleCreate} disabled={isCreating}>
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Create"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="max-w-2xl mx-auto w-full">
              <Card className="glass-dark">
                <CardHeader>
                  <CardTitle className="text-base">
                    Couldn’t load calendar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {errorMessage || "An error occurred."}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    If Google isn’t connected yet, connect it in{" "}
                    <Link
                      href="/settings"
                      className="text-primary hover:underline"
                    >
                      Settings
                    </Link>
                    .
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center text-muted-foreground py-20">
              <p className="text-lg font-medium mb-2">No upcoming events</p>
              <p className="text-sm">Nothing scheduled in the next 7 days.</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto w-full">
              {events.map((evt) => (
                <Card
                  key={evt.id}
                  className="glass-dark transition-colors hover:bg-accent/40"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">
                          {evt.link ? (
                            <a
                              href={evt.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {evt.title}
                            </a>
                          ) : (
                            evt.title
                          )}
                        </CardTitle>
                        {evt.location && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {evt.location}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm text-muted-foreground">
                          {formatWhen(evt)}
                        </p>
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRename(evt.id, evt.title)}
                          >
                            Rename
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(evt.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
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
