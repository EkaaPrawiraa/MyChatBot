"use client";

import React from "react";
import { useProfile, useUpdateProfile } from "@/src/hooks/use-profile";
import { useModels } from "@/src/hooks/use-models";
import {
  useDisconnectGoogle,
  useIntegrationsStatus,
  useUpsertTelegram,
  useDisconnectTelegram,
  useUpsertDiscord,
  useDisconnectDiscord,
} from "@/src/hooks/use-integrations";
import {
  useWhatsAppWebLogout,
  useWhatsAppWebStatus,
} from "@/src/hooks/use-whatsapp-web";
import { AppSidebar } from "@/src/components/layout/app-sidebar";
import { SidebarHeaderToggle } from "@/src/components/layout/sidebar-header-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { API_ENDPOINTS } from "@/lib/constants";
import {
  DEFAULT_SIDEBAR_MENUS,
  SIDEBAR_MENU_ITEMS,
  type SidebarMenuKey,
} from "@/src/lib/sidebar-menus";
import { Footer } from "@/src/components/layout/footer";
import { ThemeToggle } from "@/src/components/layout/theme-toggle";
import { GoogleGIcon, XLogoIcon } from "@/src/components/icons/brands";

export default function SettingsPage() {
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  const { data: models = [], isLoading: isLoadingModels } = useModels();
  const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile();

  const {
    data: integrations,
    isLoading: isLoadingIntegrations,
    refetch: refetchIntegrations,
  } = useIntegrationsStatus();
  const { mutate: disconnectGoogle, isPending: isDisconnectingGoogle } =
    useDisconnectGoogle();

  const { mutate: upsertTelegram, isPending: isUpsertingTelegram } =
    useUpsertTelegram();
  const { mutate: disconnectTelegram, isPending: isDisconnectingTelegram } =
    useDisconnectTelegram();

  const { mutate: upsertDiscord, isPending: isUpsertingDiscord } =
    useUpsertDiscord();
  const { mutate: disconnectDiscord, isPending: isDisconnectingDiscord } =
    useDisconnectDiscord();

  const {
    data: waStatus,
    isLoading: isLoadingWhatsApp,
    refetch: refetchWhatsApp,
  } = useWhatsAppWebStatus(true);
  const { mutate: waLogout, isPending: isLoggingOutWhatsApp } =
    useWhatsAppWebLogout();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("x") === "connected") {
      toast.success("X connected");
      refetchIntegrations();
      params.delete("x");
      const next = params.toString();
      const url = next
        ? `${window.location.pathname}?${next}${window.location.hash}`
        : `${window.location.pathname}${window.location.hash}`;
      window.history.replaceState({}, "", url);
    }
  }, [refetchIntegrations]);

  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    meetingHours: "",
    focusHours: "",
    communicationStyle: "professional",
    workPattern: "9am-5pm",
    aiSkill: "balanced" as "quick" | "balanced" | "deep",
    sidebarMenus: { ...DEFAULT_SIDEBAR_MENUS } as Record<
      SidebarMenuKey,
      boolean
    >,
  });

  const [showApiKey, setShowApiKey] = React.useState(false);
  const [apiKey, setApiKey] = React.useState("");
  const [selectedProvider, setSelectedProvider] = React.useState<string>("");
  const [selectedModel, setSelectedModel] = React.useState<string>("");

  const [waQrNonce, setWaQrNonce] = React.useState(0);

  const [telegramBotToken, setTelegramBotToken] = React.useState("");
  const [discordWebhookUrl, setDiscordWebhookUrl] = React.useState("");
  const [discordBotToken, setDiscordBotToken] = React.useState("");

  const persistSidebarMenus = React.useCallback(
    (next: Record<SidebarMenuKey, boolean>) => {
      const safe: Record<SidebarMenuKey, boolean> = {
        ...DEFAULT_SIDEBAR_MENUS,
        ...(next as any),
        chat: true,
        settings: true,
      };

      updateProfile(
        { sidebarMenus: safe },
        {
          onError: () => {
            toast.error("Failed to update sidebar menus");
          },
        },
      );
    },
    [updateProfile],
  );

  React.useEffect(() => {
    if (!profile) return;

    setFormData({
      name: profile.name,
      email: profile.email,
      meetingHours: profile.meetingHours || "",
      focusHours: profile.focusHours || "",
      communicationStyle: profile.communicationStyle || "professional",
      workPattern: profile.workPattern || "9am-5pm",
      aiSkill: profile.aiSkill || "balanced",
      sidebarMenus: {
        ...DEFAULT_SIDEBAR_MENUS,
        ...((profile.sidebarMenus || {}) as any),
        chat: true,
        settings: true,
      },
    });

    if (profile.aiProvider) setSelectedProvider(profile.aiProvider);
    if (profile.aiModel) setSelectedModel(profile.aiModel);
  }, [profile]);

  const handleSaveProfile = () => {
    const trimmedAiApiKey = apiKey.trim();

    updateProfile(
      {
        ...formData,
        aiProvider: selectedProvider as any,
        aiApiKey: trimmedAiApiKey.length > 0 ? trimmedAiApiKey : undefined,
        aiModel: selectedModel,
        sidebarMenus: formData.sidebarMenus,
      },
      {
        onSuccess: () => {
          toast.success("Profile updated successfully");
          setApiKey("");
          setShowApiKey(false);
        },
        onError: () => {
          toast.error("Failed to update profile");
        },
      },
    );
  };

  const handleConnectGoogle = () => {
    window.location.href = API_ENDPOINTS.GOOGLE_CONNECT;
  };

  const handleConnectX = () => {
    window.location.href = API_ENDPOINTS.X_CONNECT;
  };

  const handleDisconnectGoogle = () => {
    disconnectGoogle(undefined, {
      onSuccess: async () => {
        toast.success("Google disconnected");
        await refetchIntegrations();
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Failed to disconnect Google",
        );
      },
    });
  };

  const handleLogoutWhatsApp = () => {
    waLogout(undefined, {
      onSuccess: async () => {
        toast.success("WhatsApp logged out");
        setWaQrNonce((v) => v + 1);
        await refetchWhatsApp();
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to logout");
      },
    });
  };

  const handleSaveTelegram = () => {
    upsertTelegram(
      { bot_token: telegramBotToken.trim() },
      {
        onSuccess: async () => {
          toast.success("Telegram configured");
          setTelegramBotToken("");
          await refetchIntegrations();
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "Failed to configure Telegram",
          );
        },
      },
    );
  };

  const handleDisconnectTelegram = () => {
    disconnectTelegram(undefined, {
      onSuccess: async () => {
        toast.success("Telegram disconnected");
        await refetchIntegrations();
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Failed to disconnect Telegram",
        );
      },
    });
  };

  const handleSaveDiscord = () => {
    upsertDiscord(
      {
        webhook_url: discordWebhookUrl.trim() || undefined,
        bot_token: discordBotToken.trim() || undefined,
      },
      {
        onSuccess: async () => {
          toast.success("Discord configured");
          setDiscordWebhookUrl("");
          setDiscordBotToken("");
          await refetchIntegrations();
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "Failed to configure Discord",
          );
        },
      },
    );
  };

  const handleDisconnectDiscord = () => {
    disconnectDiscord(undefined, {
      onSuccess: async () => {
        toast.success("Discord disconnected");
        await refetchIntegrations();
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Failed to disconnect Discord",
        );
      },
    });
  };

  const uniqueProviders = Array.from(new Set(models.map((m) => m.provider)));
  const filteredModels = selectedProvider
    ? models.filter((m) => m.provider === selectedProvider)
    : [];

  const sidebarItems = SIDEBAR_MENU_ITEMS;

  if (isLoadingProfile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="bg-background border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <SidebarHeaderToggle className="mt-0.5" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your profile and preferences
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6 max-w-2xl mx-auto w-full">
            {/* Profile Settings */}
            <Card className="glass-dark">
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Name
                    </Label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="mt-1"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Email
                    </Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="mt-1"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Meeting Hours
                    </Label>
                    <Input
                      value={formData.meetingHours}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          meetingHours: e.target.value,
                        })
                      }
                      className="mt-1"
                      placeholder="9am-12pm, 2pm-5pm"
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Focus Hours
                    </Label>
                    <Input
                      value={formData.focusHours}
                      onChange={(e) =>
                        setFormData({ ...formData, focusHours: e.target.value })
                      }
                      className="mt-1"
                      placeholder="10am-12pm, 3pm-5pm"
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Communication Style
                    </Label>
                    <Select
                      value={formData.communicationStyle}
                      onValueChange={(value) =>
                        setFormData({ ...formData, communicationStyle: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">
                          Professional
                        </SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground">
                      AI Skill
                    </Label>
                    <Select
                      value={formData.aiSkill}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          aiSkill: value as any,
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Balanced" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quick">Quick</SelectItem>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="deep">Deep</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Controls how detailed the assistant replies.
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Work Pattern
                    </Label>
                    <Select
                      value={formData.workPattern}
                      onValueChange={(value) =>
                        setFormData({ ...formData, workPattern: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9am-5pm">9am - 5pm</SelectItem>
                        <SelectItem value="8am-6pm">8am - 6pm</SelectItem>
                        <SelectItem value="10am-4pm">10am - 4pm</SelectItem>
                        <SelectItem value="flexible">Flexible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={isUpdating}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isUpdating ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>

            {/* Sidebar Menus */}
            <Card className="glass-dark">
              <CardHeader>
                <CardTitle>Sidebar Menus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Hide menus you don’t use (Chat and Settings are always shown).
                </p>

                <div className="space-y-2">
                  {sidebarItems.map((item) => {
                    const key = item.key as SidebarMenuKey;
                    const checked = item.locked
                      ? true
                      : formData.sidebarMenus?.[key] !== false;

                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between rounded-lg border border-border bg-accent px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <item.icon
                            size={18}
                            className="text-muted-foreground"
                          />
                          <span className="text-sm font-medium">
                            {item.label}
                          </span>
                        </div>

                        <Switch
                          checked={checked}
                          disabled={!!item.locked}
                          onCheckedChange={(v) => {
                            if (item.locked) return;
                            setFormData((prev) => {
                              const nextMenus = {
                                ...(prev.sidebarMenus || ({} as any)),
                                [key]: v,
                                chat: true,
                                settings: true,
                              } as Record<SidebarMenuKey, boolean>;

                              persistSidebarMenus(nextMenus);
                              return {
                                ...prev,
                                sidebarMenus: nextMenus,
                              };
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* AI Configuration */}
            <Card className="glass-dark">
              <CardHeader>
                <CardTitle>AI Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Provider
                    </Label>
                    <Select
                      value={selectedProvider}
                      onValueChange={setSelectedProvider}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingModels ? (
                          <SelectItem value="__loading" disabled>
                            Loading...
                          </SelectItem>
                        ) : (
                          uniqueProviders.map((provider) => (
                            <SelectItem key={provider} value={provider}>
                              {provider.charAt(0).toUpperCase() +
                                provider.slice(1)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Model
                    </Label>
                    <Select
                      value={selectedModel}
                      onValueChange={setSelectedModel}
                      disabled={!selectedProvider}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">
                    AI Provider API Key
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1"
                      placeholder="Paste your provider API key"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff size={20} /> : <Eye size={20} />}
                    </Button>
                  </div>
                  {!!profile?.aiApiKeyMasked && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Saved key: {profile.aiApiKeyMasked}
                    </p>
                  )}
                </div>

                {selectedModel && (
                  <div className="bg-muted border border-border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      Current Configuration
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>
                        Provider:{" "}
                        <span className="text-primary">{selectedProvider}</span>
                      </p>
                      <p>
                        Model:{" "}
                        <span className="text-primary">
                          {
                            filteredModels.find((m) => m.id === selectedModel)
                              ?.name
                          }
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Integrations */}
            <Card className="glass-dark">
              <CardHeader>
                <CardTitle>Integrations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Google */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Google</p>
                      <p className="text-xs text-muted-foreground">
                        Used by the agent tools and the Google pages.
                      </p>
                    </div>
                    {integrations?.google?.connected ? (
                      <Button
                        variant="secondary"
                        onClick={handleDisconnectGoogle}
                        disabled={isDisconnectingGoogle}
                      >
                        {isDisconnectingGoogle ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Disconnect"
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleConnectGoogle}
                        disabled={isLoadingIntegrations}
                      >
                        <GoogleGIcon className="mr-2 h-4 w-4" />
                        Connect Google
                      </Button>
                    )}
                  </div>
                  {isLoadingIntegrations ? (
                    <p className="text-xs text-muted-foreground">
                      Loading status…
                    </p>
                  ) : integrations?.google?.connected ? (
                    <p className="text-xs text-muted-foreground">
                      Connected as:{" "}
                      {integrations.google.email || "(unknown email)"}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Not connected
                    </p>
                  )}

                  {integrations?.google?.connected ? (
                    <p className="text-xs text-muted-foreground">
                      If you changed Google OAuth scopes/APIs recently,
                      disconnect and connect again.
                    </p>
                  ) : null}
                </div>

                <div className="border-t border-border" />

                {/* Telegram */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Telegram</p>
                      <p className="text-xs text-muted-foreground">
                        Configure a bot token to send messages and read inbox
                        via getUpdates.
                      </p>
                    </div>
                    {integrations?.telegram?.configured ? (
                      <Button
                        variant="secondary"
                        onClick={handleDisconnectTelegram}
                        disabled={isDisconnectingTelegram}
                      >
                        {isDisconnectingTelegram ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Disconnect"
                        )}
                      </Button>
                    ) : null}
                  </div>

                  {integrations?.telegram?.configured ? (
                    <p className="text-xs text-muted-foreground">
                      Configured:{" "}
                      {integrations.telegram.botTokenMasked || "****"}
                    </p>
                  ) : (
                    <div className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
                      <div>
                        <Label className="text-xs">Bot token</Label>
                        <Input
                          value={telegramBotToken}
                          onChange={(e) => setTelegramBotToken(e.target.value)}
                          placeholder="123456:ABC..."
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="secondary"
                          disabled={
                            isUpsertingTelegram || !telegramBotToken.trim()
                          }
                          onClick={handleSaveTelegram}
                        >
                          {isUpsertingTelegram ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-border" />

                {/* Discord */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Discord</p>
                      <p className="text-xs text-muted-foreground">
                        Easiest option is a webhook URL for manual posting.
                      </p>
                    </div>
                    {integrations?.discord?.configured ? (
                      <Button
                        variant="secondary"
                        onClick={handleDisconnectDiscord}
                        disabled={isDisconnectingDiscord}
                      >
                        {isDisconnectingDiscord ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Disconnect"
                        )}
                      </Button>
                    ) : null}
                  </div>

                  {integrations?.discord?.configured ? (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div>
                        Webhook: {integrations.discord.webhookMasked || ""}
                      </div>
                      <div>
                        Bot token: {integrations.discord.botTokenMasked || ""}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
                      <div>
                        <Label className="text-xs">Webhook URL</Label>
                        <Input
                          value={discordWebhookUrl}
                          onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                          placeholder="https://discord.com/api/webhooks/..."
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Bot token (optional)</Label>
                        <Input
                          value={discordBotToken}
                          onChange={(e) => setDiscordBotToken(e.target.value)}
                          placeholder="Bot token"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="secondary"
                          disabled={
                            isUpsertingDiscord ||
                            (!discordWebhookUrl.trim() &&
                              !discordBotToken.trim())
                          }
                          onClick={handleSaveDiscord}
                        >
                          {isUpsertingDiscord ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-border" />

                {/* X */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">X</p>
                      <p className="text-xs text-muted-foreground">
                        Connect your X account via OAuth.
                      </p>
                    </div>
                    <Button
                      onClick={handleConnectX}
                      disabled={isLoadingIntegrations}
                    >
                      Connect X
                    </Button>
                  </div>

                  {isLoadingIntegrations ? (
                    <p className="text-xs text-muted-foreground">
                      Loading status…
                    </p>
                  ) : integrations?.x?.configured ? (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div>Status: Connected</div>
                      <div>
                        OAuth2 token:{" "}
                        {integrations.x.oauth2AccessTokenMasked || ""}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Not connected
                    </p>
                  )}
                </div>

                <div className="border-t border-border" />

                {/* WhatsApp */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">WhatsApp</p>
                    <p className="text-xs text-muted-foreground">
                      Connect by scanning a QR code (Linked devices).
                    </p>
                  </div>

                  {isLoadingWhatsApp ? (
                    <p className="text-xs text-muted-foreground">
                      Loading WhatsApp status…
                    </p>
                  ) : waStatus?.connected ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Connected as:{" "}
                        {waStatus.me?.name || waStatus.me?.id || "(unknown)"}
                      </p>
                      <Button
                        variant="secondary"
                        onClick={handleLogoutWhatsApp}
                        disabled={isLoggingOutWhatsApp}
                      >
                        {isLoggingOutWhatsApp ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Logout"
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        1) Open WhatsApp on your phone → Settings → Linked
                        devices → Link a device
                      </p>
                      <p className="text-xs text-muted-foreground">
                        2) Scan this QR code
                      </p>

                      <div className="inline-flex rounded-md border border-border bg-muted p-3">
                        <img
                          src={`${API_ENDPOINTS.WHATSAPP_QR_PNG}?v=${waQrNonce}`}
                          alt="WhatsApp QR"
                          className="h-48 w-48"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setWaQrNonce((v) => v + 1);
                            refetchWhatsApp();
                          }}
                        >
                          Refresh QR
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={handleLogoutWhatsApp}
                          disabled={isLoggingOutWhatsApp}
                        >
                          Force new QR
                        </Button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    This runs locally via a WhatsApp Web session.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Footer className="flex-shrink-0" />
      </div>
    </div>
  );
}
