"use client";

import React from "react";
import Link from "next/link";
import {
  addMonths,
  endOfDay,
  endOfMonth,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns";
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
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

function toRFC3339(date: Date): string {
  return date.toISOString();
}

function formatWhen(evt: { start: string; allDay?: boolean }) {
  if (!evt.start) return "";
  if (evt.allDay) return evt.start;
  return new Date(evt.start).toLocaleString();
}

function toLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseEventStart(evt: {
  start: string;
  allDay?: boolean;
}): Date | null {
  if (!evt.start) return null;
  // All-day from Google is typically YYYY-MM-DD.
  if (evt.allDay && /^\d{4}-\d{2}-\d{2}$/.test(evt.start)) {
    const [y, m, d] = evt.start.split("-").map((v) => Number(v));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }
  const dt = new Date(evt.start);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export default function CalendarPage() {
  const now = React.useMemo(() => new Date(), []);
  const [month, setMonth] = React.useState<Date>(() => startOfMonth(now));
  const [selectedDay, setSelectedDay] = React.useState<Date>(() =>
    startOfDay(now),
  );

  const timeMin = React.useMemo(
    () => toRFC3339(startOfDay(startOfMonth(month))),
    [month],
  );
  const timeMax = React.useMemo(
    () => toRFC3339(endOfDay(endOfMonth(month))),
    [month],
  );

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

  const [editingEventId, setEditingEventId] = React.useState<string | null>(
    null,
  );
  const [editTitle, setEditTitle] = React.useState("");
  const [editStart, setEditStart] = React.useState("");
  const [editEnd, setEditEnd] = React.useState("");

  React.useEffect(() => {
    // Keep selection inside current month view.
    if (
      selectedDay &&
      (selectedDay.getMonth() !== month.getMonth() ||
        selectedDay.getFullYear() !== month.getFullYear())
    ) {
      setSelectedDay(startOfDay(month));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  React.useEffect(() => {
    // Helpful defaults for a "paper calendar" workflow.
    if (!start && !end) {
      const s = new Date(selectedDay);
      s.setHours(9, 0, 0, 0);
      const e = new Date(selectedDay);
      e.setHours(10, 0, 0, 0);
      setStart(toLocalDatetimeInputValue(s));
      setEnd(toLocalDatetimeInputValue(e));
    }
  }, [selectedDay, start, end]);

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

  const startEdit = (evt: (typeof events)[number]) => {
    setEditingEventId(evt.id);
    setEditTitle(evt.title);

    if (!evt.allDay) {
      const s = evt.start ? new Date(evt.start) : null;
      const e = evt.end ? new Date(evt.end) : null;
      if (s && !Number.isNaN(s.getTime()))
        setEditStart(toLocalDatetimeInputValue(s));
      if (e && !Number.isNaN(e.getTime()))
        setEditEnd(toLocalDatetimeInputValue(e));
    } else {
      setEditStart("");
      setEditEnd("");
    }
  };

  const cancelEdit = () => {
    setEditingEventId(null);
    setEditTitle("");
    setEditStart("");
    setEditEnd("");
  };

  const saveEdit = async (evt: (typeof events)[number]) => {
    if (!editingEventId) return;
    if (!editTitle.trim()) {
      toast.error("Title cannot be empty");
      return;
    }

    try {
      const payload: {
        summary?: string;
        start?: string;
        end?: string;
      } = {
        summary: editTitle.trim(),
      };

      if (!evt.allDay) {
        if (editStart.trim() && editEnd.trim()) {
          payload.start = new Date(editStart).toISOString();
          payload.end = new Date(editEnd).toISOString();
        }
      }

      await calendarService.updateEvent(evt.id, payload);
      toast.success("Event updated");
      cancelEdit();
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

  const eventsForSelectedDay = React.useMemo(() => {
    return events
      .filter((evt) => {
        const dt = parseEventStart(evt);
        if (!dt) return false;
        return isSameDay(dt, selectedDay);
      })
      .sort((a, b) => {
        const ad = parseEventStart(a);
        const bd = parseEventStart(b);
        return (ad?.getTime() || 0) - (bd?.getTime() || 0);
      });
  }, [events, selectedDay]);

  const daysWithEvents = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const evt of events) {
      const dt = parseEventStart(evt);
      if (!dt) continue;
      const key = format(dt, "yyyy-MM-dd");
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [events]);

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
                  Paper-style month view (create / edit / delete)
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div className="max-w-5xl mx-auto w-full">
            <Card className="glass-dark overflow-hidden">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">
                      {format(month, "MMMM yyyy")}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Paper-style calendar — click a day to manage events.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setMonth((m) => subMonths(m, 1))}
                    >
                      Prev
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setMonth((m) => addMonths(m, 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-lg border border-border bg-card/40">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="h-2 w-2 rounded-full border border-border bg-background" />
                          <div className="h-2 w-2 rounded-full border border-border bg-background" />
                          <div className="h-2 w-2 rounded-full border border-border bg-background" />
                        </div>
                        <p className="text-sm font-medium">
                          {format(selectedDay, "EEE, dd MMM")}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMonth(startOfMonth(now));
                          setSelectedDay(startOfDay(now));
                        }}
                      >
                        Today
                      </Button>
                    </div>

                    <div className="p-4 flex justify-center">
                      <Calendar
                        className="mx-auto [--cell-size:--spacing(10)] md:[--cell-size:--spacing(12)]"
                        mode="single"
                        month={month}
                        onMonthChange={(m) => setMonth(startOfMonth(m))}
                        selected={selectedDay}
                        onSelect={(d) => {
                          if (!d) return;
                          setSelectedDay(startOfDay(d));
                        }}
                        classNames={{
                          root: "mx-auto",
                          nav: "hidden",
                          month_caption: "hidden",
                        }}
                        modifiers={{
                          hasEvent: (day) =>
                            daysWithEvents.has(format(day, "yyyy-MM-dd")),
                        }}
                        modifiersClassNames={{
                          hasEvent:
                            "[&>button]:relative [&>button]:after:content-[''] [&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:left-1/2 [&>button]:after:-translate-x-1/2 [&>button]:after:h-1 [&>button]:after:w-1 [&>button]:after:rounded-full [&>button]:after:bg-primary",
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Card className="bg-card/40 border-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                          Create event
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Creates directly in Google Calendar.
                        </p>
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
                            <label className="text-xs text-muted-foreground">
                              End
                            </label>
                            <Input
                              type="datetime-local"
                              value={end}
                              onChange={(e) => setEnd(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">
                              Google Meet link
                            </p>
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

                    <Card className="bg-card/40 border-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                          Events on {format(selectedDay, "dd MMM yyyy")}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Loaded for {format(month, "MMMM")}. Edit/delete
                          manually.
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {isLoading ? (
                          <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          </div>
                        ) : error ? (
                          <div>
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
                          </div>
                        ) : eventsForSelectedDay.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No events for this day.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {eventsForSelectedDay.map((evt) => {
                              const isEditing = editingEventId === evt.id;
                              return (
                                <div
                                  key={evt.id}
                                  className="rounded-lg border border-border bg-background/40 p-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">
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
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {formatWhen(evt)}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          isEditing
                                            ? cancelEdit()
                                            : startEdit(evt)
                                        }
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(evt.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  {isEditing ? (
                                    <div className="mt-3 space-y-2">
                                      <Input
                                        value={editTitle}
                                        onChange={(e) =>
                                          setEditTitle(e.target.value)
                                        }
                                        placeholder="Title"
                                      />

                                      {evt.allDay ? (
                                        <p className="text-xs text-muted-foreground">
                                          All-day event (time editing not
                                          shown).
                                        </p>
                                      ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                          <div>
                                            <label className="text-xs text-muted-foreground">
                                              Start
                                            </label>
                                            <Input
                                              type="datetime-local"
                                              value={editStart}
                                              onChange={(e) =>
                                                setEditStart(e.target.value)
                                              }
                                            />
                                          </div>
                                          <div>
                                            <label className="text-xs text-muted-foreground">
                                              End
                                            </label>
                                            <Input
                                              type="datetime-local"
                                              value={editEnd}
                                              onChange={(e) =>
                                                setEditEnd(e.target.value)
                                              }
                                            />
                                          </div>
                                        </div>
                                      )}

                                      <div className="flex items-center justify-end gap-2">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={cancelEdit}
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          onClick={() => saveEdit(evt)}
                                        >
                                          Save
                                        </Button>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="max-w-5xl mx-auto w-full text-xs text-muted-foreground">
            Tip: If you changed Google scopes recently, reconnect Google in{" "}
            <Link href="/settings" className="text-primary hover:underline">
              Settings
            </Link>
            .
          </div>
        </div>

        <Footer className="flex-shrink-0" />
      </div>
    </div>
  );
}
