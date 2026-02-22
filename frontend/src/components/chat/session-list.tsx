"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MoreVertical, Trash2, XCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { Session } from "@/types";

interface SessionListProps {
  sessions: Session[];
  activeSessionId?: string;
  onCreateSession: () => void;
  onCloseSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

export function SessionList({
  sessions,
  activeSessionId,
  onCreateSession,
  onCloseSession,
  onDeleteSession,
}: SessionListProps) {
  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Sessions</h2>
          <Button
            size="sm"
            onClick={onCreateSession}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus size={16} className="mr-1" />
            New
          </Button>
        </div>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No sessions yet. Create one to start.
            </div>
          ) : (
            sessions.map((session) =>
              (() => {
                const createdAtDate = session.createdAt
                  ? new Date(session.createdAt)
                  : null;
                const createdAtLabel =
                  createdAtDate && !Number.isNaN(createdAtDate.getTime())
                    ? formatDistanceToNow(createdAtDate, {
                        addSuffix: true,
                      })
                    : "";

                return (
                  <div
                    key={session.id}
                    className={cn(
                      "group relative px-3 py-2 rounded-lg transition-all duration-200",
                      activeSessionId === session.id
                        ? "nav-active"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent",
                    )}
                  >
                    <Link
                      href={`/chat?session=${session.id}`}
                      className="block cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {session.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {createdAtLabel || ""}
                          </p>
                        </div>
                        {session.closed && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            Closed
                          </span>
                        )}
                      </div>
                    </Link>

                    {/* Session Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.preventDefault()}
                        >
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!session.closed && (
                          <DropdownMenuItem
                            onClick={() => onCloseSession(session.id)}
                          >
                            <XCircle size={16} className="mr-2" />
                            Close
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => onDeleteSession(session.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 size={16} className="mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })(),
            )
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
