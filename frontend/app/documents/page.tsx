"use client";

import React from "react";
import Link from "next/link";
import {
  Check,
  FileDown,
  Loader2,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { AppSidebar } from "@/src/components/layout/app-sidebar";
import { SidebarHeaderToggle } from "@/src/components/layout/sidebar-header-toggle";
import { Footer } from "@/src/components/layout/footer";
import { ThemeToggle } from "@/src/components/layout/theme-toggle";
import { useIntegrationsStatus } from "@/src/hooks/use-integrations";
import {
  useDriveCreateGoogleDoc,
  useDriveCreateGoogleSheet,
  useDriveCreateTextFile,
  useDriveExport,
  useDriveSearch,
} from "@/src/hooks/use-drive";
import { useDocumentsSummarize } from "@/src/hooks/use-documents";
import type { DriveFile } from "@/src/services/drive-service";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const MIME_DOC = "application/vnd.google-apps.document";
const MIME_SHEET = "application/vnd.google-apps.spreadsheet";

function formatModified(t?: string): string {
  if (!t) return "";
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

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
            "Follow the flow: search by name → load & export → summarize → save."}
        </p>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <StepChip
            status={status(1)}
            title="1. Search"
            description="Find a file by name in Drive"
            icon={<Search className="h-4 w-4" />}
          />
          <StepChip
            status={status(2)}
            title="2. Load & Export"
            description="Pull content into the editor"
            icon={<FileDown className="h-4 w-4" />}
          />
          <StepChip
            status={status(3)}
            title="3. Summarize"
            description="Generate a clean summary"
            icon={<Sparkles className="h-4 w-4" />}
          />
          <StepChip
            status={status(4)}
            title="4. Save"
            description="Export the summary back to Drive"
            icon={<Upload className="h-4 w-4" />}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentsTab(props: {
  kind: "doc" | "sheet";
  title: string;
  driveMimeType: string;
  exportMimeType: string;
}) {
  const driveSearch = useDriveSearch();
  const driveExport = useDriveExport();
  const summarize = useDocumentsSummarize();
  const createTextFile = useDriveCreateTextFile();
  const createGoogleDoc = useDriveCreateGoogleDoc();
  const createGoogleSheet = useDriveCreateGoogleSheet();

  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<DriveFile[]>([]);
  const [selected, setSelected] = React.useState<DriveFile | null>(null);
  const [exportedText, setExportedText] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [saveName, setSaveName] = React.useState("");
  const [newName, setNewName] = React.useState("");
  const [newContent, setNewContent] = React.useState("");

  const previewUrl = React.useMemo(() => {
    if (!selected?.id) return "";
    if (props.kind === "doc") {
      return `https://docs.google.com/document/d/${encodeURIComponent(selected.id)}/preview`;
    }
    return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(selected.id)}/preview`;
  }, [props.kind, selected?.id]);

  const step = React.useMemo(() => {
    if (summary.trim()) return 4;
    if (selected && exportedText.trim()) return 3;
    if (results.length > 0) return 2;
    return 1;
  }, [exportedText, results.length, selected, summary]);

  const onSearch = () => {
    driveSearch.mutate(
      { query: query.trim(), pageSize: 50 },
      {
        onSuccess: (data) => {
          const files = (data?.files || []).filter(
            (f) => f && f.mimeType === props.driveMimeType,
          );
          setResults(files);
          setSelected(null);
          setExportedText("");
          setSummary("");
          setSaveName("");
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Search failed"),
      },
    );
  };

  const onLoad = (file: DriveFile) => {
    setSelected(file);
    setExportedText("");
    setSummary("");
    setSaveName("");

    driveExport.mutate(
      { fileId: file.id, mimeType: props.exportMimeType, maxBytes: 40000 },
      {
        onSuccess: (data) => {
          setExportedText(data?.text || "");
          setSaveName(`Summary - ${file.name}`);
          if (data?.truncated) {
            toast.message("Export truncated", {
              description: `Reached max bytes (${data.max_bytes}).`,
            });
          }
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Export failed"),
      },
    );
  };

  const onSummarize = () => {
    if (!exportedText.trim()) return;
    summarize.mutate(
      {
        title: selected?.name || "",
        kind: props.kind,
        content: exportedText,
        maxWords: 200,
      },
      {
        onSuccess: (data) => setSummary(data?.summary || ""),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Summarize failed"),
      },
    );
  };

  const onSave = () => {
    const name = saveName.trim();
    if (!name || !summary.trim()) return;

    createTextFile.mutate(
      {
        name: name.toLowerCase().endsWith(".txt") ? name : `${name}.txt`,
        content: summary,
        mimeType: "text/plain",
      },
      {
        onSuccess: (data) => {
          toast.success("Saved to Drive");
          if (data?.webViewLink) {
            window.open(data.webViewLink, "_blank", "noopener,noreferrer");
          }
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Save failed"),
      },
    );
  };

  const onSaveAsGoogleDoc = () => {
    const name = saveName.trim();
    if (!name || !summary.trim()) return;

    createGoogleDoc.mutate(
      { name, content: summary },
      {
        onSuccess: (data) => {
          toast.success("Created Google Doc");
          if (data?.webViewLink) {
            window.open(data.webViewLink, "_blank", "noopener,noreferrer");
          }
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Create Google Doc failed",
          ),
      },
    );
  };

  const onCreateNew = () => {
    const name = newName.trim();
    if (!name) return;

    if (props.kind === "doc") {
      createGoogleDoc.mutate(
        { name, content: newContent },
        {
          onSuccess: (data) => {
            toast.success("Created Google Doc");
            if (data?.webViewLink) {
              window.open(data.webViewLink, "_blank", "noopener,noreferrer");
            }
          },
          onError: (err) =>
            toast.error(
              err instanceof Error ? err.message : "Create Google Doc failed",
            ),
        },
      );
      return;
    }

    createGoogleSheet.mutate(
      { name, csv: newContent },
      {
        onSuccess: (data) => {
          toast.success("Created Google Sheet");
          if (data?.webViewLink) {
            window.open(data.webViewLink, "_blank", "noopener,noreferrer");
          }
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Create Google Sheet failed",
          ),
      },
    );
  };

  return (
    <div className="space-y-6">
      <StepsHeader step={step} title={props.title} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="glass-dark lg:col-span-5 overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Search & pick a file</CardTitle>
              <Badge variant="secondary">Step 1–2</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Search by name, then load to export content.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a file name…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSearch();
                }}
                disabled={driveSearch.isPending}
              />
              <Button
                onClick={onSearch}
                disabled={driveSearch.isPending || !query.trim()}
              >
                {driveSearch.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Search"
                )}
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card/30">
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
                <div className="text-sm font-medium">
                  Results{" "}
                  <span className="text-muted-foreground">
                    ({results.length})
                  </span>
                </div>
                {driveSearch.isPending ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Searching…
                  </div>
                ) : null}
              </div>

              <div className="max-h-[420px] overflow-auto p-2">
                {results.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">
                    No {props.title.toLowerCase()} found.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {results.map((f) => {
                      const isSelected = selected?.id === f.id;
                      const isLoading = driveExport.isPending && isSelected;

                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => onLoad(f)}
                          disabled={driveExport.isPending}
                          className={cn(
                            "w-full text-left rounded-lg border border-border p-3",
                            "bg-card/40 hover:bg-accent/40 transition-colors",
                            isSelected && "ring-1 ring-primary/30",
                            driveExport.isPending && "opacity-80",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">
                                {f.name}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {formatModified(f.modifiedTime)
                                  ? `Modified: ${formatModified(f.modifiedTime)}`
                                  : null}
                              </div>
                              {f.webViewLink ? (
                                <Link
                                  className="inline-block text-xs text-primary hover:underline mt-1"
                                  href={f.webViewLink}
                                  target="_blank"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Open in Drive
                                </Link>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-2">
                              {isSelected ? (
                                <Badge variant="secondary">Selected</Badge>
                              ) : null}
                              <div className="text-xs text-muted-foreground">
                                {isLoading ? (
                                  <span className="inline-flex items-center gap-2">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Loading…
                                  </span>
                                ) : (
                                  "Load"
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-dark lg:col-span-7 overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">
                Export → Summarize → Save
              </CardTitle>
              <Badge variant="secondary">Step 2–4</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Load content, generate a summary, then save it back to Drive.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border border-border bg-card/30 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">Exported content</div>
                <div className="text-xs text-muted-foreground">Max 40KB</div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {selected ? (
                  <>
                    Selected:{" "}
                    <span className="text-foreground">{selected.name}</span>
                  </>
                ) : (
                  "Pick a file on the left to export it."
                )}
              </div>

              {selected ? (
                <div className="mt-3 rounded-lg overflow-hidden border border-border bg-background">
                  <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card/40">
                    <div className="text-xs text-muted-foreground">
                      Preview (live)
                    </div>
                    {selected.webViewLink ? (
                      <Link
                        className="text-xs text-primary hover:underline"
                        href={selected.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open
                      </Link>
                    ) : null}
                  </div>
                  <iframe
                    key={selected.id}
                    src={previewUrl}
                    title={`${props.title} preview`}
                    className="w-full h-[420px]"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : null}

              <Textarea
                value={exportedText}
                onChange={(e) => setExportedText(e.target.value)}
                placeholder={
                  props.kind === "doc"
                    ? "Text export (used for summarization) will appear here"
                    : "CSV export (used for summarization) will appear here"
                }
                className="min-h-44 mt-3"
                disabled={!selected}
              />
            </div>

            <div className="rounded-xl border border-border bg-card/30 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">Summary</div>
                <Button
                  onClick={onSummarize}
                  disabled={summarize.isPending || !exportedText.trim()}
                  size="sm"
                >
                  {summarize.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Summarize"
                  )}
                </Button>
              </div>

              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Summary will appear here"
                className="min-h-32"
              />

              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <Input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Name for saved summary"
                  disabled={
                    createTextFile.isPending || createGoogleDoc.isPending
                  }
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={onSave}
                    disabled={
                      createTextFile.isPending ||
                      !saveName.trim() ||
                      !summary.trim()
                    }
                  >
                    {createTextFile.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Save .txt"
                    )}
                  </Button>

                  <Button
                    onClick={onSaveAsGoogleDoc}
                    disabled={
                      createGoogleDoc.isPending ||
                      !saveName.trim() ||
                      !summary.trim()
                    }
                  >
                    {createGoogleDoc.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Save Doc"
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/30 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">Create new</div>
                <Badge variant="secondary">Optional</Badge>
              </div>

              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`New ${props.title} name`}
                disabled={
                  createGoogleDoc.isPending || createGoogleSheet.isPending
                }
              />

              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder={
                  props.kind === "doc"
                    ? "Write the document content here"
                    : "Paste CSV content here (optional)"
                }
                className="min-h-28"
                disabled={
                  createGoogleDoc.isPending || createGoogleSheet.isPending
                }
              />

              <Button
                onClick={onCreateNew}
                disabled={
                  !newName.trim() ||
                  createGoogleDoc.isPending ||
                  createGoogleSheet.isPending
                }
              >
                {createGoogleDoc.isPending || createGoogleSheet.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : props.kind === "doc" ? (
                  "Create Google Doc"
                ) : (
                  "Create Google Sheet"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const { data: integrations, isLoading: isLoadingIntegrations } =
    useIntegrationsStatus();
  const isGoogleConnected = !!integrations?.google?.connected;

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <AppSidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="bg-background border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <SidebarHeaderToggle className="mt-0.5" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold">Documents</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Search Drive, export content, summarize, and save summaries.
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6 max-w-4xl mx-auto w-full">
            {!isLoadingIntegrations && !isGoogleConnected ? (
              <Card className="glass-dark">
                <CardHeader>
                  <CardTitle className="text-base">
                    Google not connected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Connect Google in{" "}
                    <Link
                      href="/settings"
                      className="text-primary hover:underline"
                    >
                      Settings
                    </Link>{" "}
                    to use Documents.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="docs">
                <TabsList>
                  <TabsTrigger value="docs">Google Docs</TabsTrigger>
                  <TabsTrigger value="sheets">Google Sheets</TabsTrigger>
                </TabsList>

                <TabsContent value="docs" className="mt-6">
                  <DocumentsTab
                    kind="doc"
                    title="Google Docs"
                    driveMimeType={MIME_DOC}
                    exportMimeType="text/plain"
                  />
                </TabsContent>

                <TabsContent value="sheets" className="mt-6">
                  <DocumentsTab
                    kind="sheet"
                    title="Google Sheets"
                    driveMimeType={MIME_SHEET}
                    exportMimeType="text/csv"
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>

        <Footer className="flex-shrink-0" />
      </div>
    </div>
  );
}
