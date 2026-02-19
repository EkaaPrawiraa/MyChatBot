'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ToolBadge } from './tool-badge'
import type { Message } from '@/types'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-slide-in`}>
      <div
        className={`max-w-2xl px-4 py-3 rounded-lg ${
          isUser
            ? 'message-user'
            : 'message-assistant'
        }`}
      >
        {/* Content */}
        <div className={`${isUser ? 'text-white' : 'text-foreground'}`}>
          {isUser ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code: ({ inline, className, children, ...props }: any) => (
                    <code
                      className={`${
                        inline
                          ? 'bg-white/10 rounded px-1.5 py-0.5 text-xs'
                          : 'block bg-black/40 rounded p-3 overflow-x-auto my-2'
                      } font-mono`}
                      {...props}
                    >
                      {children}
                    </code>
                  ),
                  p: ({ children }: any) => <p className="text-sm leading-relaxed mb-2">{children}</p>,
                  ul: ({ children }: any) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                  ol: ({ children }: any) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                  li: ({ children }: any) => <li className="text-sm">{children}</li>,
                  a: ({ href, children }: any) => (
                    <a href={href} className="text-accent-glow-bright hover:underline" target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Bottom Bar - Tools, Intent, Latency */}
        {!isUser && (message.toolsUsed || message.intent || message.latency) && (
          <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-2 items-center text-xs">
            {message.intent && <span className="text-muted-foreground">Intent: {message.intent}</span>}
            {message.toolsUsed && message.toolsUsed.length > 0 && (
              <div className="flex gap-2">
                {message.toolsUsed.map((tool) => (
                  <ToolBadge key={tool} name={tool} />
                ))}
              </div>
            )}
            {message.latency && (
              <span className="text-muted-foreground ml-auto">{message.latency}ms</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
