'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { useSessions, useCreateSession, useDeleteSession, useCloseSession, useUpdateSession } from '@/src/hooks/use-sessions'
import { useSendMessage } from '@/src/hooks/use-chat'
import { SessionList } from '@/src/components/chat/session-list'
import { MessageList } from '@/src/components/chat/message-list'
import { ChatInput } from '@/src/components/chat/chat-input'
import { AppLayout } from '@/src/components/layout/app-layout'
import { Sidebar } from '@/src/components/layout/sidebar'
import { toast } from 'sonner'
import type { Message } from '@/types'

export default function ChatPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')
  const [messages, setMessages] = React.useState<Message[]>([])

  const { data: sessions = [] } = useSessions()
  const { mutate: sendMessage, isPending: isSending } = useSendMessage()
  const { mutate: createSession } = useCreateSession()
  const { mutate: deleteSession } = useDeleteSession(sessionId || '')
  const { mutate: closeSession } = useCloseSession(sessionId || '')
  const { mutate: updateSession } = useUpdateSession(sessionId || '')

  const handleSendMessage = (content: string) => {
    if (!sessionId) {
      toast.error('Please create or select a session first')
      return
    }

    // Add user message to UI
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      sessionId: sessionId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])

    // Send to API
    sendMessage(
      { sessionId, message: content },
      {
        onSuccess: (response) => {
          const assistantMessage: Message = {
            id: response.id,
            sessionId: sessionId,
            role: 'assistant',
            content: response.message,
            intent: response.intent,
            toolsUsed: response.toolsUsed,
            latency: response.latency,
            requiresApproval: response.requiresApproval,
            createdAt: new Date().toISOString(),
          }

          setMessages((prev) => [...prev, assistantMessage])
          toast.success('Message sent')
        },
        onError: () => {
          toast.error('Failed to send message')
        },
      }
    )
  }

  const handleCreateSession = () => {
    createSession(undefined, {
      onSuccess: () => {
        toast.success('Session created')
      },
      onError: () => {
        toast.error('Failed to create session')
      },
    })
  }

  const handleDeleteSession = (id: string) => {
    deleteSession(undefined, {
      onSuccess: () => {
        toast.success('Session deleted')
        setMessages([])
      },
      onError: () => {
        toast.error('Failed to delete session')
      },
    })
  }

  const handleCloseSession = (id: string) => {
    closeSession(undefined, {
      onSuccess: () => {
        toast.success('Session closed')
      },
      onError: () => {
        toast.error('Failed to close session')
      },
    })
  }

  const handleUpdateSession = (id: string, title: string) => {
    updateSession({ title }, {
      onSuccess: () => {
        toast.success('Session updated')
      },
      onError: () => {
        toast.error('Failed to update session')
      },
    })
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden lg:flex w-[280px] flex-col flex-shrink-0 border-r border-white/10">
        <Sidebar />
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Session List and Chat */}
        <div className="flex flex-1 overflow-hidden">
          {/* Session List - Hidden on small screens */}
          <div className="hidden md:flex md:w-80 flex-col flex-shrink-0">
            <SessionList
              sessions={sessions}
              activeSessionId={sessionId || undefined}
              onCreateSession={handleCreateSession}
              onDeleteSession={handleDeleteSession}
              onCloseSession={handleCloseSession}
              onUpdateSession={handleUpdateSession}
            />
          </div>

          {/* Chat Area */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="glass-dark border-b border-white/10 px-6 py-4">
              <h1 className="text-xl font-semibold">Chat</h1>
            </div>

            {sessionId ? (
              <>
                <MessageList messages={messages} isLoading={isSending} />
                <ChatInput
                  onSendMessage={handleSendMessage}
                  isLoading={isSending}
                  disabled={!sessionId}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg font-medium mb-2">No session selected</p>
                  <p className="text-sm">Create a new session to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
