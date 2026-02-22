"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useSessions,
  useCreateSession,
  useCloseSession,
  useDeleteSession,
  useSessionMessages,
} from "@/src/hooks/use-sessions";
import { useSendMessage, useVoiceTranscribe } from "@/src/hooks/use-chat";
import { SessionList } from "@/src/components/chat/session-list";
import { MessageList } from "@/src/components/chat/message-list";
import { ChatInput } from "@/src/components/chat/chat-input";
import { AppSidebar } from "@/src/components/layout/app-sidebar";
import { SidebarHeaderToggle } from "@/src/components/layout/sidebar-header-toggle";
import { Footer } from "@/src/components/layout/footer";
import { ThemeToggle } from "@/src/components/layout/theme-toggle";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { Message } from "@/types";

export default function ChatPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [showSessionsSidebar, setShowSessionsSidebar] = React.useState(true);
  const [isMobileSessionsOpen, setIsMobileSessionsOpen] = React.useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = React.useState(false);
  const [voiceStatus, setVoiceStatus] = React.useState<
    "idle" | "requesting" | "recording" | "transcribing" | "error"
  >("idle");
  const [voiceStatusDetail, setVoiceStatusDetail] = React.useState<string>("");
  const [voiceLevel, setVoiceLevel] = React.useState(0);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<BlobPart[]>([]);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const sourceNodeRef = React.useRef<MediaStreamAudioSourceNode | null>(null);
  const rafIdRef = React.useRef<number | null>(null);

  const stopLevelMonitor = React.useCallback(() => {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    try {
      sourceNodeRef.current?.disconnect();
    } catch {
      // ignore
    }
    try {
      analyserRef.current?.disconnect();
    } catch {
      // ignore
    }

    sourceNodeRef.current = null;
    analyserRef.current = null;

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }

    setVoiceLevel(0);
  }, []);

  const startLevelMonitor = React.useCallback(
    (stream: MediaStream) => {
      stopLevelMonitor();

      const AudioContextImpl =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextImpl) {
        return;
      }

      const ctx = new AudioContextImpl();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyserRef.current = analyser;

      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(data);

        // RMS amplitude approx (0..1)
        let sumSquares = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sumSquares += v * v;
        }
        const rms = Math.sqrt(sumSquares / data.length);
        // Slight boost for UI readability
        setVoiceLevel(Math.min(1, rms * 2.5));

        rafIdRef.current = requestAnimationFrame(tick);
      };

      rafIdRef.current = requestAnimationFrame(tick);
    },
    [stopLevelMonitor],
  );

  React.useEffect(() => {
    return () => {
      stopLevelMonitor();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [stopLevelMonitor]);

  const { data: sessions = [] } = useSessions();
  const {
    data: sessionMessages,
    isLoading: isHistoryLoading,
    isFetching: isHistoryFetching,
  } = useSessionMessages(sessionId);
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const { mutate: transcribeVoice, isPending: isTranscribing } =
    useVoiceTranscribe();
  const { mutate: createSession } = useCreateSession();
  const { mutate: closeSession } = useCloseSession(sessionId || "");
  const { mutate: deleteSession } = useDeleteSession();

  React.useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    // When switching sessions, clear immediately so we don't flash the
    // previous session's messages while the new history loads.
    setMessages([]);
  }, [sessionId]);

  React.useEffect(() => {
    // When selecting a session on mobile, close the sessions overlay.
    setIsMobileSessionsOpen(false);
  }, [sessionId]);

  React.useEffect(() => {
    if (!sessionId) return;
    if (sessionMessages) {
      setMessages(sessionMessages);
    }
  }, [sessionId, sessionMessages]);

  const handleSendMessage = (content: string) => {
    if (!sessionId) {
      return;
    }

    // Allow typing/sending during background refetches; only block on initial load.
    if (isHistoryLoading) {
      return;
    }

    const tempId = `msg-${Date.now()}`;
    const userMessage: Message = {
      id: tempId,
      sessionId: sessionId,
      role: "user",
      content,
      clientStatus: "sending",
      clientStatusDetail: "Sending…",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    sendMessage(
      { sessionId, message: content },
      {
        onSuccess: (response) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? { ...m, clientStatus: "sent", clientStatusDetail: "Sent" }
                : m,
            ),
          );

          const assistantMessage: Message = {
            id: response.id,
            sessionId: sessionId,
            role: "assistant",
            content: response.message,
            intent: response.intent,
            toolsUsed: response.toolsUsed,
            latency: response.latency,
            requiresApproval: response.requiresApproval,
            createdAt: new Date().toISOString(),
          };

          setMessages((prev) => [...prev, assistantMessage]);
        },
        onError: (error) => {
          const detail =
            error instanceof Error ? error.message : "Failed to send message";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? {
                    ...m,
                    clientStatus: "error",
                    clientStatusDetail: detail,
                  }
                : m,
            ),
          );
        },
      },
    );
  };

  const handleVoiceRecord = async () => {
    if (!sessionId) return;
    if (isHistoryLoading) return;
    if (isTranscribing) return;

    // Toggle behavior: if currently recording, stop.
    const existing = mediaRecorderRef.current;
    if (existing && existing.state !== "inactive") {
      existing.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Voice recording is not supported in this browser");
      setVoiceStatus("error");
      setVoiceStatusDetail("Not supported");
      return;
    }

    try {
      setVoiceStatus("requesting");
      setVoiceStatusDetail("Requesting permission…");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let recorder: MediaRecorder;
      try {
        // Prefer webm when available.
        recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      } catch {
        recorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      setIsVoiceRecording(true);
      setVoiceStatus("recording");
      setVoiceStatusDetail("Recording…");
      startLevelMonitor(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        setIsVoiceRecording(false);
        setVoiceStatus("transcribing");
        setVoiceStatusDetail("Transcribing…");
        stopLevelMonitor();
        stream.getTracks().forEach((t) => t.stop());

        const mimeType = recorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        if (audioBlob.size === 0) {
          toast.error("No audio captured");
          setVoiceStatus("error");
          setVoiceStatusDetail("No audio captured");
          return;
        }

        transcribeVoice(
          { sessionId, file: audioBlob },
          {
            onSuccess: (result) => {
              const transcription = result.transcription?.trim();
              if (!transcription) {
                toast.error("No transcription returned");
                setVoiceStatus("error");
                setVoiceStatusDetail("No transcription returned");
                return;
              }
              setVoiceStatus("idle");
              setVoiceStatusDetail("");
              handleSendMessage(transcription);
            },
            onError: () => {
              toast.error("Failed to transcribe voice");
              setVoiceStatus("error");
              setVoiceStatusDetail("Transcription failed");
            },
          },
        );
      };

      recorder.start();
    } catch (e) {
      const detail =
        e instanceof Error ? e.message : "Microphone permission denied";
      toast.error(detail);
      setIsVoiceRecording(false);
      mediaRecorderRef.current = null;
      setVoiceStatus("error");
      setVoiceStatusDetail(detail);
      stopLevelMonitor();
    }
  };

  const handleCreateSession = () => {
    const desiredTitle =
      typeof window !== "undefined" ? window.prompt("Session title?") : "";
    const title = desiredTitle?.trim() || "";

    createSession(title ? { title } : undefined, {
      onSuccess: () => {
        toast.success("Session created");
      },
      onError: () => {
        toast.error("Failed to create session");
      },
    });
  };

  const handleCloseSession = (id: string) => {
    closeSession(undefined, {
      onSuccess: () => {
        toast.success("Session closed");
      },
      onError: () => {
        toast.error("Failed to close session");
      },
    });
  };

  const handleDeleteSession = (id: string) => {
    deleteSession(id, {
      onSuccess: () => {
        if (id === sessionId) {
          setMessages([]);
          router.push("/chat");
        }
        toast.success("Session deleted");
      },
      onError: () => {
        toast.error("Failed to delete session");
      },
    });
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <AppSidebar />

      {isMobileSessionsOpen ? (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Sessions"
        >
          <div
            className="absolute inset-0 bg-background/80"
            onClick={() => setIsMobileSessionsOpen(false)}
          />
          <div className="relative flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
            <div className="flex-1 min-h-0">
              <SessionList
                sessions={sessions}
                activeSessionId={sessionId || undefined}
                onCreateSession={handleCreateSession}
                onCloseSession={handleCloseSession}
                onDeleteSession={handleDeleteSession}
                headerAction={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobileSessionsOpen(false)}
                    aria-label="Close sessions"
                  >
                    <PanelLeftClose size={18} />
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex flex-1 overflow-hidden min-h-0">
          {showSessionsSidebar && (
            <div className="hidden md:flex md:w-80 flex-col flex-shrink-0">
              <SessionList
                sessions={sessions}
                activeSessionId={sessionId || undefined}
                onCreateSession={handleCreateSession}
                onCloseSession={handleCloseSession}
                onDeleteSession={handleDeleteSession}
              />
            </div>
          )}

          <div className="flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="bg-background border-b border-border px-4 py-3 md:px-6 md:py-4">
              <div className="mx-auto w-full max-w-3xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <SidebarHeaderToggle />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="md:hidden"
                      onClick={() => setIsMobileSessionsOpen(true)}
                      aria-label="Open sessions"
                    >
                      <PanelLeftOpen size={18} />
                    </Button>
                    <h1 className="text-lg font-semibold md:text-xl">Chat</h1>
                  </div>
                  <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <div className="hidden md:flex">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowSessionsSidebar((v) => !v)}
                        aria-label={
                          showSessionsSidebar
                            ? "Hide sessions sidebar"
                            : "Show sessions sidebar"
                        }
                      >
                        {showSessionsSidebar ? (
                          <PanelLeftClose size={18} />
                        ) : (
                          <PanelLeftOpen size={18} />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {sessionId ? (
              <>
                {isHistoryLoading && !sessionMessages ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      Loading messages…
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0">
                    <div className="mx-auto w-full max-w-3xl h-full flex flex-col min-h-0">
                      <MessageList messages={messages} isLoading={isSending} />
                    </div>
                  </div>
                )}
                <div className="mx-auto w-full max-w-3xl">
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    onVoiceRecord={handleVoiceRecord}
                    isVoiceRecording={isVoiceRecording}
                    voiceStatus={isTranscribing ? "transcribing" : voiceStatus}
                    voiceStatusDetail={voiceStatusDetail}
                    voiceLevel={voiceLevel}
                    isLoading={isSending || isTranscribing}
                    disabled={!sessionId || isHistoryLoading}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg font-medium mb-2">
                    No session selected
                  </p>
                  <p className="text-sm">
                    Create a new session to start chatting
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
