"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Play, Square, Copy, Check } from "lucide-react";
import { ToolBadge } from "./tool-badge";
import type { Message } from "@/types";

interface MessageBubbleProps {
  message: Message;
}

function formatMessageTime(
  iso: string | undefined,
): { label: string; title: string } | null {
  if (!iso) return null;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  const label = dt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const title = dt.toLocaleString();
  return { label, title };
}

function toSpeechText(input: string): string {
  // Basic markdown cleanup for nicer speech.
  return input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/[#>*_~|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitIntoSpeechChunks(text: string, maxLen = 180): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const sentences = cleaned.split(/(?<=[.!?])\s+/g);
  const chunks: string[] = [];
  let buf = "";
  for (const s of sentences) {
    const next = buf ? `${buf} ${s}` : s;
    if (next.length <= maxLen) {
      buf = next;
      continue;
    }
    if (buf) chunks.push(buf);
    // If a single sentence is huge, hard-split.
    if (s.length > maxLen) {
      for (let i = 0; i < s.length; i += maxLen) {
        chunks.push(s.slice(i, i + maxLen));
      }
      buf = "";
    } else {
      buf = s;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

function pickBestVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const lang = (typeof navigator !== "undefined" && navigator.language) || "en";
  const base = lang.split("-")[0].toLowerCase();

  const byLang = voices.filter((v) =>
    (v.lang || "").toLowerCase().startsWith(base),
  );
  const pool = byLang.length > 0 ? byLang : voices;

  const preferredName = /(google|natural|neural|siri|premium)/i;
  const best =
    pool.find((v) => preferredName.test(v.name)) ||
    pool.find((v) => (v.localService ?? true) === true) ||
    pool[0];

  return best || null;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const time = React.useMemo(
    () => formatMessageTime(message.createdAt),
    [message.createdAt],
  );
  const canSpeak =
    !isUser &&
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance !== "undefined";
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([]);
  const voiceRef = React.useRef<SpeechSynthesisVoice | null>(null);
  const activeRef = React.useRef(false);

  React.useEffect(() => {
    if (!canSpeak) return;
    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const v = synth.getVoices() || [];
      setVoices(v);
    };

    loadVoices();
    synth.addEventListener?.("voiceschanged", loadVoices);

    return () => {
      if (!canSpeak) return;
      window.speechSynthesis.cancel();
      synth.removeEventListener?.("voiceschanged", loadVoices);
    };
  }, [canSpeak]);

  React.useEffect(() => {
    if (!canSpeak) return;
    voiceRef.current = pickBestVoice(voices);
  }, [canSpeak, voices]);

  const stopSpeaking = () => {
    if (!canSpeak) return;
    activeRef.current = false;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const speakChunks = (chunks: string[], idx: number) => {
    if (!canSpeak) return;
    if (!activeRef.current) return;
    if (idx >= chunks.length) {
      setIsSpeaking(false);
      activeRef.current = false;
      return;
    }

    const utterance = new window.SpeechSynthesisUtterance(chunks[idx]);
    const voice = voiceRef.current;
    if (voice) utterance.voice = voice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.onend = () => speakChunks(chunks, idx + 1);
    utterance.onerror = () => stopSpeaking();
    window.speechSynthesis.speak(utterance);
  };

  const handleToggleSpeak = () => {
    if (!canSpeak) return;

    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    const text = toSpeechText(message.content || "");
    if (!text) return;

    const chunks = splitIntoSpeechChunks(text);
    if (chunks.length === 0) return;

    window.speechSynthesis.cancel();
    activeRef.current = true;
    setIsSpeaking(true);
    speakChunks(chunks, 0);
  };

  const handleCopy = async () => {
    const text = (message.content || "").trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // no-op: clipboard may be blocked by browser permissions
    }
  };

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4 animate-slide-in`}
    >
      <div
        className={`group relative max-w-2xl px-4 py-3 rounded-lg ${
          isUser ? "message-user" : "message-assistant"
        } min-w-0 break-words`}
      >
        {/* Content */}
        <div className={`${isUser ? "text-white" : "text-foreground"}`}>
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          ) : (
            <div className="flex items-start gap-2 min-w-0">
              <div className="prose prose-sm dark:prose-invert max-w-none flex-1 min-w-0 break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: ({ inline, className, children, ...props }: any) => (
                      <code
                        className={`${
                          inline
                            ? "bg-muted rounded px-1.5 py-0.5 text-xs"
                            : "block bg-muted rounded p-3 overflow-x-auto my-2 border border-border"
                        } font-mono`}
                        {...props}
                      >
                        {children}
                      </code>
                    ),
                    p: ({ children }: any) => (
                      <p className="text-sm leading-relaxed mb-2">{children}</p>
                    ),
                    ul: ({ children }: any) => (
                      <ul className="list-disc list-inside mb-2 space-y-1">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }: any) => (
                      <ol className="list-decimal list-inside mb-2 space-y-1">
                        {children}
                      </ol>
                    ),
                    li: ({ children }: any) => (
                      <li className="text-sm">{children}</li>
                    ),
                    a: ({ href, children }: any) => (
                      <a
                        href={href}
                        className="text-primary hover:underline break-words"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bar - Tools, Intent, Latency */}
        {!isUser &&
          (message.toolsUsed || message.intent || message.latency) && (
            <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-2 items-center text-xs">
              {message.intent && (
                <span className="text-muted-foreground">
                  Intent: {message.intent}
                </span>
              )}
              {message.toolsUsed && message.toolsUsed.length > 0 && (
                <div className="flex gap-2">
                  {message.toolsUsed.map((tool) => (
                    <ToolBadge key={tool} name={tool} />
                  ))}
                </div>
              )}
              {message.latency && (
                <span className="text-muted-foreground ml-auto">
                  {message.latency}ms
                </span>
              )}
            </div>
          )}

        {/* Meta row (timestamp + actions) */}
        <div
          className={
            isUser
              ? "mt-2 flex items-center gap-2 text-xs text-primary-foreground/80"
              : "mt-2 flex items-center gap-2 text-xs text-muted-foreground"
          }
        >
          {isUser && message.clientStatus ? (
            <span
              className={
                message.clientStatus === "error" ? "text-destructive" : ""
              }
            >
              {message.clientStatusDetail ||
                (message.clientStatus === "sending"
                  ? "Sending…"
                  : message.clientStatus === "sent"
                    ? "Sent"
                    : "Failed to send")}
            </span>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${isUser ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground"}`}
                onClick={handleCopy}
                aria-label={copied ? "Copied" : "Copy message"}
                title={copied ? "Copied" : "Copy"}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </Button>

              {!isUser && canSpeak ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={handleToggleSpeak}
                  aria-label={isSpeaking ? "Stop audio" : "Play audio"}
                  title={isSpeaking ? "Stop" : "Play"}
                >
                  {isSpeaking ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              ) : null}
            </div>

            {time ? <span title={time.title}>{time.label}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
