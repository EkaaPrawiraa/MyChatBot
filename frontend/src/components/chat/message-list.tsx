"use client";

import React, { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Message } from "@/types";

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  onScrollToBottom?: () => void;
}

export function MessageList({
  messages,
  isLoading,
  onScrollToBottom,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = React.useState(false);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight < 50;
    setShowScrollButton(!isAtBottom);
  };

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1 min-h-0" onScroll={handleScroll}>
        <div className="p-2 sm:p-3 md:p-4 space-y-2.5 sm:space-y-3 md:space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground py-12 md:py-20">
              <div>
                <p className="text-lg font-medium mb-2">Start a conversation</p>
                <p className="text-sm">
                  Send a message to begin interacting with aXis Assistant
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}

          {isLoading && <TypingIndicator />}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-3 right-3 md:bottom-4 md:right-4 rounded-full shadow-lg"
          onClick={() => {
            scrollToBottom();
            setShowScrollButton(false);
          }}
        >
          <ChevronDown size={18} className="md:hidden" />
          <ChevronDown size={20} className="hidden md:block" />
        </Button>
      )}
    </div>
  );
}
