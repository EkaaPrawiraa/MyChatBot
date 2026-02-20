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
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  };

  return (
    <div className="p-4 border-t border-border">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isInputDisabled}
            className={cn(
              "resize-none rounded-lg text-sm min-h-10",
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
              "text-muted-foreground hover:text-primary",
              isVoiceRecording && "text-primary",
            )}
          >
            <Mic size={20} />
          </Button>
        )}

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isInputDisabled}
          size="icon"
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Send size={20} />
        </Button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
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
                className="h-2 w-24 rounded bg-muted border border-border overflow-hidden"
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
  );
}
