"use client";

import React from "react";
import Link from "next/link";
import { AppSidebar } from "@/src/components/layout/app-sidebar";
import { SidebarHeaderToggle } from "@/src/components/layout/sidebar-header-toggle";
import { ThemeToggle } from "@/src/components/layout/theme-toggle";
import { Footer } from "@/src/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Check,
  FileDown,
  Loader2,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useWebFetch, useWebSearch } from "@/src/hooks/use-web";
import { useDocumentsSummarize } from "@/src/hooks/use-documents";
import { useDriveCreateGoogleDoc } from "@/src/hooks/use-drive";
import type {
  WebFetchResponse,
  WebSearchResponse,
} from "@/src/services/web-service";
import type { DriveCreateGoogleDocResponse } from "@/src/services/drive-service";
import { cn } from "@/lib/utils";

type StepStatus = "todo" | "active" | "done";

function StepChip(props: {
  status: StepStatus;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  const isDone = props.status === "done";
  const isActive = props.status === "active";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border p-3",
        "bg-card/50 backdrop-blur-sm",
        isActive && "ring-1 ring-primary/30",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity",
          isActive && "opacity-100",
        )}
      >
        <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-primary/5 blur-2xl" />
      </div>

      <div className="relative flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-border",
            isDone ? "bg-primary text-primary-foreground" : "bg-muted/30",
          )}
        >
          {isDone ? <Check className="h-4 w-4" /> : props.icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium truncate">{props.title}</div>
            {isActive ? <Badge variant="secondary">Current</Badge> : null}
            {isDone ? <Badge variant="secondary">Done</Badge> : null}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {props.description}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepsHeader(props: { step: number; title: string; hint?: string }) {
  const status = (n: number): StepStatus => {
    if (props.step === n) return "active";
    if (props.step > n) return "done";
    return "todo";
  };

  return (
    <Card className="glass-dark relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -left-16 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <CardHeader className="pb-4">
        <CardTitle className="text-base">{props.title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {props.hint ||
            "Follow the flow: search → select a result → fetch content → summarize → save."}
        </p>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <StepChip
            status={status(1)}
            title="1. Search"
            description="Find relevant pages"
            icon={<Search className="h-4 w-4" />}
          />
          <StepChip
            status={status(2)}
            title="2. Select"
            description="Choose the best result"
            icon={<FileDown className="h-4 w-4" />}
          />
          <StepChip
            status={status(3)}
            title="3. Fetch"
            description="Load page text"
            icon={<Sparkles className="h-4 w-4" />}
          />
          <StepChip
            status={status(4)}
            title="4. Summarize & Save"
            description="Create + store a summary"
            icon={<Upload className="h-4 w-4" />}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function WebSearchPage() {
  const { mutate: webSearch, isPending: isSearching } = useWebSearch();
  const { mutate: webFetch, isPending: isFetching } = useWebFetch();
  const { mutate: summarize, isPending: isSummarizing } =
    useDocumentsSummarize();
  const { mutate: createGoogleDoc, isPending: isSavingDoc } =
    useDriveCreateGoogleDoc();

  const [query, setQuery] = React.useState("");
  const [maxResults, setMaxResults] = React.useState("5");
  const [searchRaw, setSearchRaw] = React.useState<WebSearchResponse | null>(
    null,
  );

  const results = searchRaw?.results || [];

  const [selectedUrl, setSelectedUrl] = React.useState<string>("");
  const [selectedTitle, setSelectedTitle] = React.useState<string>("");

  const [maxBytes, setMaxBytes] = React.useState("20000");
  const [fetchRaw, setFetchRaw] = React.useState<WebFetchResponse | null>(null);

  const [maxWords, setMaxWords] = React.useState("200");
  const [summary, setSummary] = React.useState<string>("");

  const [saveDocName, setSaveDocName] = React.useState<string>("");
  const [saveParentId, setSaveParentId] = React.useState<string>("");
  const [savedDocLink, setSavedDocLink] = React.useState<string>("");

  const canSearch = query.trim().length > 0;
  const canFetch = selectedUrl.trim().length > 0;
  const canSummarize = (fetchRaw?.text || "").trim().length > 0;
  const canSave = summary.trim().length > 0 && saveDocName.trim().length > 0;

  const step = React.useMemo(() => {
    if (summary.trim()) return 4;
    if ((fetchRaw?.text || "").trim()) return 3;
    if (results.length > 0) return 2;
    return 1;
  }, [fetchRaw?.text, results.length, summary]);

  return (
    <div className="flex h-screen">
      <AppSidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="bg-background border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <SidebarHeaderToggle className="mt-0.5" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold">Web Search</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Search the web, fetch a page, then summarize.
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6 max-w-5xl mx-auto w-full">
            <StepsHeader
              step={step}
              title="How it works"
              hint="Search the web, read snippets, fetch the best page, then summarize and save it to Google Docs."
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <Card className="glass-dark">
                  <CardHeader>
                    <CardTitle>Search</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Query</Label>
                        <Input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="e.g. prabowo latest news"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          Tip: be specific (topic + site + timeframe).
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Max results</Label>
                        <Input
                          value={maxResults}
                          onChange={(e) => setMaxResults(e.target.value)}
                          placeholder="5"
                        />
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      disabled={isSearching || !canSearch}
                      onClick={() => {
                        const parsedMax = Number(maxResults);
                        setSearchRaw(null);
                        setFetchRaw(null);
                        setSummary("");
                        setSelectedUrl("");
                        setSelectedTitle("");

                        webSearch(
                          {
                            query: query.trim(),
                            maxResults: Number.isFinite(parsedMax)
                              ? parsedMax
                              : 5,
                          },
                          {
                            onSuccess: (val) => {
                              setSearchRaw(val);
                              toast.success("Search complete");
                            },
                            onError: (err) => {
                              toast.error(
                                err instanceof Error
                                  ? err.message
                                  : "Search failed",
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

                    {searchRaw?.warnings?.length ? (
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Warnings:</div>
                        {searchRaw.warnings.map((w, idx) => (
                          <div key={idx}>- {w}</div>
                        ))}
                      </div>
                    ) : null}

                    {searchRaw ? (
                      <div className="text-xs text-muted-foreground">
                        Source: {searchRaw.source || "—"}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className="glass-dark">
                  <CardHeader>
                    <CardTitle>Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="h-80 overflow-y-auto pr-1">
                      {results.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-xs text-muted-foreground">
                            Search to see results here.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {results.map((r, idx) => {
                            const url = r.url || "";
                            const title = r.title || url;
                            const snippet = r.snippet || "";
                            const selected = url === selectedUrl;

                            return (
                              <button
                                key={`${url}-${idx}`}
                                type="button"
                                onClick={() => {
                                  setSelectedUrl(url);
                                  setSelectedTitle(title);
                                  setFetchRaw(null);
                                  setSummary("");
                                  setSavedDocLink("");
                                }}
                                className={`w-full text-left rounded-md border border-border px-3 py-2 hover:bg-muted/30 transition ${
                                  selected ? "bg-muted/30" : ""
                                }`}
                              >
                                <div className="text-sm font-medium line-clamp-2">
                                  {title}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {url}
                                </div>
                                {snippet ? (
                                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {snippet}
                                  </div>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="glass-dark">
                  <CardHeader>
                    <CardTitle>Fetch</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Selected URL</Label>
                        <Input value={selectedUrl} readOnly />
                        <div className="text-xs text-muted-foreground mt-1">
                          Select a result on the left first.
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Max bytes</Label>
                        <Input
                          value={maxBytes}
                          onChange={(e) => setMaxBytes(e.target.value)}
                          placeholder="20000"
                        />
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      disabled={isFetching || !canFetch}
                      onClick={() => {
                        const parsedMaxBytes = Number(maxBytes);
                        setFetchRaw(null);
                        setSummary("");

                        webFetch(
                          {
                            url: selectedUrl,
                            maxBytes: Number.isFinite(parsedMaxBytes)
                              ? parsedMaxBytes
                              : 20000,
                          },
                          {
                            onSuccess: (val) => {
                              setFetchRaw(val);
                              toast.success("Fetched page");
                            },
                            onError: (err) => {
                              toast.error(
                                err instanceof Error
                                  ? err.message
                                  : "Fetch failed",
                              );
                            },
                          },
                        );
                      }}
                    >
                      {isFetching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Fetch"
                      )}
                    </Button>

                    <div>
                      <Label className="text-xs">Fetched text</Label>
                      <Textarea
                        value={fetchRaw?.text || ""}
                        readOnly
                        placeholder="Fetch a result to see page text here"
                        className="h-56 resize-none overflow-y-auto"
                      />
                      {fetchRaw?.truncated ? (
                        <div className="text-xs text-muted-foreground mt-1">
                          Note: truncated to max bytes.
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-dark">
                  <CardHeader>
                    <CardTitle>Summarize</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Max words</Label>
                        <Input
                          value={maxWords}
                          onChange={(e) => setMaxWords(e.target.value)}
                          placeholder="200"
                        />
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      disabled={isSummarizing || !canSummarize}
                      onClick={() => {
                        const parsedMaxWords = Number(maxWords);
                        summarize(
                          {
                            title: selectedTitle || selectedUrl,
                            kind: "web",
                            content: fetchRaw?.text || "",
                            maxWords: Number.isFinite(parsedMaxWords)
                              ? parsedMaxWords
                              : 200,
                          },
                          {
                            onSuccess: (val) => {
                              setSummary(val?.summary || "");
                              if (!saveDocName.trim()) {
                                const base = (
                                  selectedTitle || "Web summary"
                                ).trim();
                                setSaveDocName(
                                  base.length > 80 ? base.slice(0, 80) : base,
                                );
                              }
                              setSavedDocLink("");
                              toast.success("Summarized");
                            },
                            onError: (err) => {
                              toast.error(
                                err instanceof Error
                                  ? err.message
                                  : "Summarize failed",
                              );
                            },
                          },
                        );
                      }}
                    >
                      {isSummarizing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Summarize"
                      )}
                    </Button>

                    <div>
                      <Label className="text-xs">Summary</Label>
                      <Textarea
                        value={summary}
                        readOnly
                        placeholder="Click Summarize to generate a summary"
                        className="h-56 resize-none overflow-y-auto"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Google Doc name</Label>
                          <Input
                            value={saveDocName}
                            onChange={(e) => setSaveDocName(e.target.value)}
                            placeholder="e.g. Web summary - topic"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">
                            Parent folder ID (optional)
                          </Label>
                          <Input
                            value={saveParentId}
                            onChange={(e) => setSaveParentId(e.target.value)}
                            placeholder="Drive folder id"
                          />
                        </div>
                      </div>

                      <Button
                        variant="secondary"
                        disabled={isSavingDoc || !canSave}
                        onClick={() => {
                          createGoogleDoc(
                            {
                              name: saveDocName.trim(),
                              content: summary,
                              parentId: saveParentId.trim() || undefined,
                            },
                            {
                              onSuccess: (val) => {
                                const resp =
                                  val as DriveCreateGoogleDocResponse;
                                const link = resp?.webViewLink || "";
                                setSavedDocLink(link);
                                toast.success("Saved to Google Docs");
                              },
                              onError: (err) => {
                                toast.error(
                                  err instanceof Error
                                    ? err.message
                                    : "Save failed",
                                );
                              },
                            },
                          );
                        }}
                      >
                        {isSavingDoc ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Save as Google Doc"
                        )}
                      </Button>

                      {savedDocLink ? (
                        <div className="text-xs text-muted-foreground">
                          Saved:{" "}
                          <Link
                            href={savedDocLink}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            Open Google Doc
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}
