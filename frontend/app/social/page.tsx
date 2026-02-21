"use client";

import React from "react";
import { AppSidebar } from "@/src/components/layout/app-sidebar";
import { SidebarHeaderToggle } from "@/src/components/layout/sidebar-header-toggle";
import { ThemeToggle } from "@/src/components/layout/theme-toggle";
import { Footer } from "@/src/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useIntegrationsStatus } from "@/src/hooks/use-integrations";
import {
  useDiscordWebhookSend,
  useTelegramSend,
  useTelegramUpdates,
} from "@/src/hooks/use-social";

export default function SocialPage() {
  const { data: integrations, isLoading: isLoadingIntegrations } =
    useIntegrationsStatus();

  const { mutate: telegramSend, isPending: isTelegramSending } =
    useTelegramSend();
  const { mutate: telegramUpdates, isPending: isTelegramLoading } =
    useTelegramUpdates();
  const { mutate: discordWebhookSend, isPending: isDiscordSending } =
    useDiscordWebhookSend();

  const [telegramChatId, setTelegramChatId] = React.useState("");
  const [telegramMessage, setTelegramMessage] = React.useState("");
  const [telegramOffset, setTelegramOffset] = React.useState<string>("");
  const [telegramUpdatesRaw, setTelegramUpdatesRaw] = React.useState<any>(null);

  const [discordContent, setDiscordContent] = React.useState("");
  const [discordUsername, setDiscordUsername] = React.useState("");
  const [discordResult, setDiscordResult] = React.useState<any>(null);

  const telegramConfigured = !!integrations?.telegram?.configured;
  const discordConfigured = !!integrations?.discord?.configured;

  return (
    <div className="flex h-screen">
      <AppSidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="bg-background border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <SidebarHeaderToggle className="mt-0.5" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold">Social</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manual inbox + click-to-send for connected platforms.
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6 max-w-5xl mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-dark">
                <CardHeader>
                  <CardTitle>Telegram</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingIntegrations ? (
                    <p className="text-xs text-muted-foreground">
                      Loading status…
                    </p>
                  ) : telegramConfigured ? (
                    <p className="text-xs text-muted-foreground">
                      Configured:{" "}
                      {integrations?.telegram?.botTokenMasked || "****"}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Not configured. Add a bot token in Settings →
                      Integrations.
                    </p>
                  )}

                  <div className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
                    <p className="text-sm font-medium">Send message</p>
                    <div>
                      <Label className="text-xs">Chat ID</Label>
                      <Input
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        placeholder="e.g. 123456789"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Message</Label>
                      <Textarea
                        value={telegramMessage}
                        onChange={(e) => setTelegramMessage(e.target.value)}
                        placeholder="Type a message…"
                        rows={4}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="secondary"
                        disabled={
                          isTelegramSending ||
                          !telegramConfigured ||
                          !telegramChatId.trim() ||
                          !telegramMessage.trim()
                        }
                        onClick={() => {
                          telegramSend(
                            {
                              chat_id: telegramChatId.trim(),
                              message: telegramMessage.trim(),
                            },
                            {
                              onSuccess: (val) => {
                                toast.success("Telegram message sent");
                                setTelegramMessage("");
                                setTelegramUpdatesRaw(val);
                              },
                              onError: (err) => {
                                toast.error(
                                  err instanceof Error
                                    ? err.message
                                    : "Send failed",
                                );
                              },
                            },
                          );
                        }}
                      >
                        {isTelegramSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Send"
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          Inbox (getUpdates)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Shows the raw Telegram updates payload.
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        disabled={isTelegramLoading || !telegramConfigured}
                        onClick={() => {
                          const parsedOffset = Number(telegramOffset);
                          telegramUpdates(
                            {
                              offset:
                                telegramOffset.trim() &&
                                !Number.isNaN(parsedOffset)
                                  ? parsedOffset
                                  : undefined,
                              limit: 50,
                            },
                            {
                              onSuccess: (val) => setTelegramUpdatesRaw(val),
                              onError: (err) => {
                                toast.error(
                                  err instanceof Error
                                    ? err.message
                                    : "Load failed",
                                );
                              },
                            },
                          );
                        }}
                      >
                        {isTelegramLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Load"
                        )}
                      </Button>
                    </div>

                    <div>
                      <Label className="text-xs">Offset (optional)</Label>
                      <Input
                        value={telegramOffset}
                        onChange={(e) => setTelegramOffset(e.target.value)}
                        placeholder="e.g. 123"
                      />
                    </div>

                    {telegramUpdatesRaw ? (
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                        {JSON.stringify(telegramUpdatesRaw, null, 2)}
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-dark">
                <CardHeader>
                  <CardTitle>Discord</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingIntegrations ? (
                    <p className="text-xs text-muted-foreground">
                      Loading status…
                    </p>
                  ) : discordConfigured ? (
                    <p className="text-xs text-muted-foreground">
                      Configured: {integrations?.discord?.webhookMasked || ""}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Not configured. Add a webhook URL in Settings →
                      Integrations.
                    </p>
                  )}

                  <div className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
                    <p className="text-sm font-medium">Post to webhook</p>
                    <div>
                      <Label className="text-xs">Username (optional)</Label>
                      <Input
                        value={discordUsername}
                        onChange={(e) => setDiscordUsername(e.target.value)}
                        placeholder="Axis Assistant"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Message</Label>
                      <Textarea
                        value={discordContent}
                        onChange={(e) => setDiscordContent(e.target.value)}
                        placeholder="Type a message…"
                        rows={6}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="secondary"
                        disabled={
                          isDiscordSending ||
                          !discordConfigured ||
                          !discordContent.trim()
                        }
                        onClick={() => {
                          discordWebhookSend(
                            {
                              content: discordContent.trim(),
                              username: discordUsername.trim() || undefined,
                            },
                            {
                              onSuccess: (val) => {
                                toast.success("Posted to Discord");
                                setDiscordResult(val);
                                setDiscordContent("");
                              },
                              onError: (err) => {
                                toast.error(
                                  err instanceof Error
                                    ? err.message
                                    : "Post failed",
                                );
                              },
                            },
                          );
                        }}
                      >
                        {isDiscordSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Post"
                        )}
                      </Button>
                    </div>

                    {discordResult ? (
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                        {JSON.stringify(discordResult, null, 2)}
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <Footer className="flex-shrink-0" />
      </div>
    </div>
  );
}
