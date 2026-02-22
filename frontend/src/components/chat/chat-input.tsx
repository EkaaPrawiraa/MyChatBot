"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onVoiceRecord?: () => void;
  isVoiceRecording?: boolean;
  voiceStatus?: "idle" | "requesting" | "recording" | "transcribing" | "error";
  voiceStatusDetail?: string;
  voiceLevel?: number;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  onVoiceRecord,
  isVoiceRecording,
  voiceStatus = "idle",
  voiceStatusDetail,
  voiceLevel = 0,
  isLoading,
  disabled,
  placeholder = "Type your message...",
}: ChatInputProps) {
  const [message, setMessage] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const isInputDisabled = Boolean(disabled || isLoading || isVoiceRecording);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 96) + "px";
    }
  };

  return (
    <div className="flex-shrink-0 px-2 py-2.5 md:py-4 border-t border-border bg-background pb-[calc(env(safe-area-inset-bottom)+0.625rem)] md:pb-4">
      <div className="mx-auto w-full max-w-3xl px-1">
        <div className="grid grid-cols-[1fr_auto_auto] items-end gap-1.5 md:gap-2.5 rounded-2xl border border-border bg-background px-3 py-2">
          <div className="min-w-0">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isInputDisabled}
              className={cn(
                "resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-transparent",
                "rounded-none px-0 py-0",
                "text-[13px] md:text-sm leading-snug min-h-8 md:min-h-10",
                "placeholder:text-muted-foreground",
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
              aria-label={
                isVoiceRecording ? "Stop recording" : "Start voice recording"
              }
              className={cn(
                "h-9 w-9 md:h-10 md:w-10 shrink-0 text-muted-foreground hover:text-primary",
                isVoiceRecording && "text-primary",
              )}
            >
              <Mic size={18} className="md:hidden" />
              <Mic size={20} className="hidden md:block" />
            </Button>
          )}

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!message.trim() || isInputDisabled}
            size="icon"
            className="h-9 w-9 md:h-10 md:w-10 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send size={18} className="md:hidden" />
            <Send size={20} className="hidden md:block" />
          </Button>
        </div>

        <div className="hidden md:flex mt-2 items-center justify-between gap-2">
          <p className="hidden sm:block text-xs text-muted-foreground">
            Press Shift + Enter for new line
          </p>

          {onVoiceRecord ? (
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  "text-xs",
                  voiceStatus === "error"
                    ? "text-destructive"
                    : voiceStatus === "recording"
                      ? "text-primary"
                      : "text-muted-foreground",
                )}
              >
                Mic:
                {voiceStatus === "requesting"
                  ? " Requesting…"
                  : voiceStatus === "recording"
                    ? " Recording…"
                    : voiceStatus === "transcribing"
                      ? " Transcribing…"
                      : voiceStatus === "error"
                        ? ` ${voiceStatusDetail || "Error"}`
                        : " Ready"}
              </span>

              {voiceStatus === "recording" ? (
                <div
                  className="h-2 w-20 sm:w-24 rounded bg-muted border border-border overflow-hidden"
                  aria-label="Microphone input level"
                >
                  <div
                    className="h-full bg-primary/70"
                    style={{
                      width: `${Math.round(
                        Math.min(1, Math.max(0, voiceLevel)) * 100,
                      )}%`,
                    }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
