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
  useXCreateTweet,
  useXMe,
  useXMyTweets,
  useXSearch,
} from "@/src/hooks/use-x";

type XPublicMetrics = {
  followersCount?: number;
  followingCount?: number;
  likeCount?: number;
  listedCount?: number;
  mediaCount?: number;
  tweetCount?: number;
};

type XMeData = {
  id?: string;
  name?: string;
  username?: string;
  description?: string;
  createdAt?: string;
  profileImageUrl?: string;
  verified?: boolean;
  publicMetrics?: XPublicMetrics;
};

type XMeResponse = { data?: XMeData };

type XUser = {
  id?: string;
  name?: string;
  username?: string;
  profileImageUrl?: string;
  verified?: boolean;
};

type XTweet = {
  id?: string;
  text?: string;
  createdAt?: string;
  authorId?: string;
  publicMetrics?: {
    likeCount?: number;
    replyCount?: number;
    retweetCount?: number;
    quoteCount?: number;
  };
};

type XSearchResponse = {
  data?: XTweet[];
  includes?: {
    users?: XUser[];
  };
};

export default function XPage() {
  const { data: integrations, isLoading: isLoadingIntegrations } =
    useIntegrationsStatus();

  const { mutate: xMe, isPending: isLoadingMe } = useXMe();
  const { mutate: xMyTweets, isPending: isLoadingTweets } = useXMyTweets();
  const { mutate: xCreateTweet, isPending: isCreatingTweet } =
    useXCreateTweet();
  const { mutate: xSearch, isPending: isSearching } = useXSearch();

  const [meRaw, setMeRaw] = React.useState<XMeResponse | null>(null);
  const [tweetsRaw, setTweetsRaw] = React.useState<any>(null);
  const [tweetText, setTweetText] = React.useState("");
  const [tweetsLimit, setTweetsLimit] = React.useState("10");
  const [tweetResult, setTweetResult] = React.useState<any>(null);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchLimit, setSearchLimit] = React.useState("10");
  const [searchRaw, setSearchRaw] = React.useState<XSearchResponse | null>(
    null,
  );

  const xConnected = !!integrations?.x?.configured;

  const me = meRaw?.data;

  const usersById = React.useMemo(() => {
    const out = new Map<string, XUser>();
    const users = searchRaw?.includes?.users;
    if (!Array.isArray(users)) return out;
    for (const u of users) {
      if (u?.id) out.set(u.id, u);
    }
    return out;
  }, [searchRaw]);

  return (
    <div className="flex h-screen">
      <AppSidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="bg-background border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <SidebarHeaderToggle className="mt-0.5" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold">X</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  View your profile, fetch tweets, and post.
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6 max-w-5xl mx-auto w-full">
            <Card className="glass-dark">
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoadingIntegrations ? (
                  <p className="text-xs text-muted-foreground">Loading…</p>
                ) : xConnected ? (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Connected: yes</div>
                    <div>
                      OAuth2 token:{" "}
                      {integrations?.x?.oauth2AccessTokenMasked || ""}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Not connected. Go to Settings → Integrations → X.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-dark">
                <CardHeader>
                  <CardTitle>My Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    variant="secondary"
                    disabled={isLoadingMe || !xConnected}
                    onClick={() => {
                      xMe(undefined, {
                        onSuccess: (val) => {
                          setMeRaw(val as XMeResponse);
                          toast.success("Loaded profile");
                        },
                        onError: (err) => {
                          toast.error(
                            err instanceof Error ? err.message : "Failed",
                          );
                        },
                      });
                    }}
                  >
                    {isLoadingMe ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Load"
                    )}
                  </Button>

                  {meRaw ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        {me?.profileImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={me.profileImageUrl}
                            alt="X profile"
                            className="h-12 w-12 rounded-full border border-border"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full border border-border" />
                        )}

                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {me?.name || "(unknown)"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            @{me?.username || ""}
                            {me?.verified ? " · verified" : ""}
                          </div>
                          {me?.description ? (
                            <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                              {me.description}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {me?.publicMetrics ? (
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>
                            Followers: {me.publicMetrics.followersCount ?? "—"}
                          </div>
                          <div>
                            Following: {me.publicMetrics.followingCount ?? "—"}
                          </div>
                          <div>
                            Tweets: {me.publicMetrics.tweetCount ?? "—"}
                          </div>
                          <div>Likes: {me.publicMetrics.likeCount ?? "—"}</div>
                        </div>
                      ) : null}

                      {me?.createdAt ? (
                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(me.createdAt).toLocaleString()}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="glass-dark">
                <CardHeader>
                  <CardTitle>My Tweets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Limit</Label>
                    <Input
                      value={tweetsLimit}
                      onChange={(e) => setTweetsLimit(e.target.value)}
                      placeholder="10"
                    />
                  </div>

                  <Button
                    variant="secondary"
                    disabled={isLoadingTweets || !xConnected}
                    onClick={() => {
                      const parsed = Number(tweetsLimit);
                      xMyTweets(
                        {
                          limit:
                            tweetsLimit.trim() && !Number.isNaN(parsed)
                              ? parsed
                              : undefined,
                        },
                        {
                          onSuccess: (val) => {
                            setTweetsRaw(val);
                            toast.success("Loaded tweets");
                          },
                          onError: (err) => {
                            toast.error(
                              err instanceof Error ? err.message : "Failed",
                            );
                          },
                        },
                      );
                    }}
                  >
                    {isLoadingTweets ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Load"
                    )}
                  </Button>

                  {tweetsRaw ? (
                    <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                      {JSON.stringify(tweetsRaw, null, 2)}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <Card className="glass-dark">
              <CardHeader>
                <CardTitle>Search X</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <Label className="text-xs">Query</Label>
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder='e.g. "nextjs" or "from:someone"'
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max Results</Label>
                    <Input
                      value={searchLimit}
                      onChange={(e) => setSearchLimit(e.target.value)}
                      placeholder="10"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    disabled={isSearching || !xConnected || !searchQuery.trim()}
                    onClick={() => {
                      const parsed = Number(searchLimit);
                      xSearch(
                        {
                          query: searchQuery.trim(),
                          maxResults:
                            searchLimit.trim() && !Number.isNaN(parsed)
                              ? parsed
                              : undefined,
                        },
                        {
                          onSuccess: (val) => {
                            setSearchRaw(val as XSearchResponse);
                            toast.success("Search complete");
                          },
                          onError: (err) => {
                            toast.error(
                              err instanceof Error ? err.message : "Failed",
                            );
                          },
                        },
                      );
                    }}
                  >
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Search"
                    )}
                  </Button>
                </div>

                {searchRaw ? (
                  Array.isArray(searchRaw.data) ? (
                    searchRaw.data.length ? (
                      <div className="space-y-3">
                        {searchRaw.data.map((t, idx) => {
                          const author = t.authorId
                            ? usersById.get(t.authorId)
                            : undefined;
                          const createdAtLabel = t.createdAt
                            ? new Date(t.createdAt).toLocaleString()
                            : "";

                          return (
                            <div
                              key={t.id || String(idx)}
                              className="rounded-md border border-border p-3 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2 min-w-0">
                                  {author?.profileImageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={author.profileImageUrl}
                                      alt="X author"
                                      className="h-7 w-7 rounded-full border border-border"
                                    />
                                  ) : (
                                    <div className="h-7 w-7 rounded-full border border-border" />
                                  )}

                                  <div className="min-w-0">
                                    <div className="text-xs text-muted-foreground truncate">
                                      {author?.name || "(unknown)"}
                                      {author?.username
                                        ? ` @${author.username}`
                                        : ""}
                                      {author?.verified ? " · verified" : ""}
                                    </div>
                                    <div className="text-sm whitespace-pre-wrap break-words">
                                      {t.text || ""}
                                    </div>
                                  </div>
                                </div>

                                {createdAtLabel ? (
                                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                                    {createdAtLabel}
                                  </div>
                                ) : null}
                              </div>

                              {t.publicMetrics ? (
                                <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
                                  <div>
                                    Likes: {t.publicMetrics.likeCount ?? "—"}
                                  </div>
                                  <div>
                                    Replies: {t.publicMetrics.replyCount ?? "—"}
                                  </div>
                                  <div>
                                    Reposts:{" "}
                                    {t.publicMetrics.retweetCount ?? "—"}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No results.
                      </p>
                    )
                  ) : (
                    <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                      {JSON.stringify(searchRaw, null, 2)}
                    </div>
                  )
                ) : null}

                {!xConnected ? (
                  <p className="text-xs text-muted-foreground">
                    Connect X first in Settings → Integrations → X.
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="glass-dark">
              <CardHeader>
                <CardTitle>Post a Tweet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Text</Label>
                  <Textarea
                    value={tweetText}
                    onChange={(e) => setTweetText(e.target.value)}
                    placeholder="What\'s happening?"
                    rows={4}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    disabled={
                      isCreatingTweet ||
                      !xConnected ||
                      !tweetText.trim() ||
                      tweetText.trim().length > 280
                    }
                    onClick={() => {
                      xCreateTweet(
                        { text: tweetText.trim() },
                        {
                          onSuccess: (val) => {
                            setTweetResult(val);
                            toast.success("Tweet posted");
                            setTweetText("");
                          },
                          onError: (err) => {
                            toast.error(
                              err instanceof Error ? err.message : "Failed",
                            );
                          },
                        },
                      );
                    }}
                  >
                    {isCreatingTweet ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Post"
                    )}
                  </Button>
                </div>

                {tweetText.trim().length > 280 ? (
                  <p className="text-xs text-muted-foreground">
                    Max 280 characters.
                  </p>
                ) : null}

                {tweetResult ? (
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                    {JSON.stringify(tweetResult, null, 2)}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>

        <Footer className="flex-shrink-0" />
      </div>
    </div>
  );
}
