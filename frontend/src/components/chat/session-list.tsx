'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, MoreVertical, Trash2, PenTool, XCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Session } from '@/types'

interface SessionListProps {
  sessions: Session[]
  activeSessionId?: string
  onCreateSession: () => void
  onDeleteSession: (id: string) => void
  onCloseSession: (id: string) => void
  onUpdateSession: (id: string, title: string) => void
}

export function SessionList({
  sessions,
  activeSessionId,
  onCreateSession,
  onDeleteSession,
  onCloseSession,
  onUpdateSession,
}: SessionListProps) {
  const router = useRouter()
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editTitle, setEditTitle] = React.useState('')

  const handleStartEdit = (id: string, currentTitle: string) => {
    setEditingId(id)
    setEditTitle(currentTitle)
  }

  const handleSaveEdit = (id: string) => {
    if (editTitle.trim()) {
      onUpdateSession(id, editTitle)
    }
    setEditingId(null)
  }

  return (
    <div className="glass-dark flex flex-col h-full border-r border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Sessions</h2>
          <Button
            size="sm"
            onClick={onCreateSession}
            className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
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
            sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  'group relative px-3 py-2 rounded-lg transition-all duration-200',
                  activeSessionId === session.id
                    ? 'nav-active bg-purple-600/10 text-accent-glow-bright'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )}
              >
                {editingId === session.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => handleSaveEdit(session.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(session.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="w-full bg-transparent border border-white/20 rounded px-2 py-1 text-sm text-foreground outline-none"
                  />
                ) : (
                  <Link href={`/chat?session=${session.id}`} className="block cursor-pointer">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{session.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {session.closed && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Closed</span>
                      )}
                    </div>
                  </Link>
                )}

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
                    <DropdownMenuItem onClick={() => handleStartEdit(session.id, session.title)}>
                      <PenTool size={16} className="mr-2" />
                      Rename
                    </DropdownMenuItem>
                    {!session.closed && (
                      <DropdownMenuItem onClick={() => onCloseSession(session.id)}>
                        <XCircle size={16} className="mr-2" />
                        Close
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => onDeleteSession(session.id)}
                      className="text-red-500"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
