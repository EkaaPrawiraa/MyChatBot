"use client";

import React from "react";
import { AppSidebar } from "@/src/components/layout/app-sidebar";
import { SidebarHeaderToggle } from "@/src/components/layout/sidebar-header-toggle";
import { Footer } from "@/src/components/layout/footer";
import { ThemeToggle } from "@/src/components/layout/theme-toggle";
import { useActivities } from "@/src/hooks/use-activities";
import { useWhatsAppWebStatus } from "@/src/hooks/use-whatsapp-web";
import apiClient from "@/src/services/api-client";
import { API_ENDPOINTS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function WhatsAppPage() {
  const { data: waStatus, isLoading: isLoadingIntegrations } =
    useWhatsAppWebStatus(true);

  const { data: activities = [], isLoading: isLoadingActivities } =
    useActivities({
      page: 1,
      pageSize: 50,
    });

  const [to, setTo] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);

  const waActivities = React.useMemo(() => {
    return (activities || []).filter((a) =>
      (a.tools || []).some(
        (t) => t === "whatsapp.send" || t === "whatsapp.receive",
      ),
    );
  }, [activities]);

  const connected = Boolean(waStatus?.connected);

  const handleSend = async () => {
    const trimmedTo = to.trim();
    const trimmedMsg = message.trim();

    if (!trimmedTo || !trimmedMsg) {
      toast.error("To + message are required");
      return;
    }

    setIsSending(true);
    try {
      await apiClient.post(API_ENDPOINTS.WHATSAPP_SEND, {
        to: trimmedTo,
        message: trimmedMsg,
      });
      toast.success("WhatsApp message sent");
      setMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-screen">
      <AppSidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="bg-background border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <SidebarHeaderToggle className="mt-0.5" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold">WhatsApp</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Integration status, sending, and recent activity
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6 max-w-4xl mx-auto w-full">
            <Card className="glass-dark">
              <CardHeader>
                <CardTitle>Integration Status</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingIntegrations ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading…
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Badge variant={connected ? "secondary" : "destructive"}>
                      {connected ? "Connected" : "Not Connected"}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {connected
                        ? `Connected as: ${waStatus?.me?.name || waStatus?.me?.id || "(unknown)"}`
                        : "Connect via QR in Settings."}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-dark">
              <CardHeader>
                <CardTitle>Send Message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">To</Label>
                  <Input
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="mt-1"
                    placeholder="e.g. +15551234567"
                  />
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">
                    Message
                  </Label>
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-1"
                    placeholder="Type a message"
                  />
                </div>

                <Button
                  onClick={handleSend}
                  disabled={isSending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending
                    </>
                  ) : (
                    "Send"
                  )}
                </Button>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
              {isLoadingActivities ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading…
                </div>
              ) : waActivities.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No WhatsApp tool activity yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {waActivities.map((a) => (
                    <Card
                      key={a.id}
                      className="glass-dark transition-colors hover:bg-accent/40"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-base">
                              {a.query}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge
                                variant={
                                  a.success ? "secondary" : "destructive"
                                }
                              >
                                {a.success ? "Success" : "Failed"}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="border-primary/30"
                              >
                                WhatsApp
                              </Badge>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(a.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {a.error ? (
                          <div className="text-sm text-destructive">
                            {a.error}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            Tools: {(a.tools || []).join(", ")}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <Footer className="flex-shrink-0" />
      </div>
    </div>
  );
}
