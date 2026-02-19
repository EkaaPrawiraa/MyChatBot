'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Mic } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  onVoiceRecord?: () => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  onSendMessage,
  onVoiceRecord,
  isLoading,
  disabled,
  placeholder = 'Type your message...',
}: ChatInputProps) {
  const [message, setMessage] = React.useState('')
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message)
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }

  return (
    <div className="p-4 border-t border-white/10">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className={cn(
              'resize-none rounded-lg bg-white/5 border border-white/10',
              'focus:border-accent-glow-bright focus:outline-none focus:ring-1 focus:ring-accent-glow-bright',
              'placeholder:text-muted-foreground text-sm'
            )}
            rows={1}
          />
        </div>

        {/* Voice Button */}
        {onVoiceRecord && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onVoiceRecord}
            disabled={disabled || isLoading}
            className="text-muted-foreground hover:text-accent-glow-bright"
          >
            <Mic size={20} />
          </Button>
        )}

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled || isLoading}
          size="icon"
          className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 glow-purple"
        >
          <Send size={20} />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Press Shift + Enter for new line
      </p>
    </div>
  )
}
