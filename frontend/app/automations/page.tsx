"use client";

import React from "react";
import {
  useAutomations,
  useCreateAutomation,
  useUpdateAutomation,
  useDeleteAutomation,
} from "@/src/hooks/use-automations";
import { AppSidebar } from "@/src/components/layout/app-sidebar";
import { SidebarHeaderToggle } from "@/src/components/layout/sidebar-header-toggle";
import { Footer } from "@/src/components/layout/footer";
import { ThemeToggle } from "@/src/components/layout/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";

export default function AutomationsPage() {
  const { data: automations = [], isLoading } = useAutomations();
  const { mutate: createAutomation } = useCreateAutomation();
  const { mutate: updateAutomation, isPending: isUpdating } =
    useUpdateAutomation();
  const { mutate: deleteAutomation } = useDeleteAutomation();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    trigger: "",
    condition: "",
    action: "",
    enabled: true,
  });

  const [editFormData, setEditFormData] = React.useState({
    name: "",
    trigger: "",
    condition: "",
    action: "",
    enabled: true,
  });

  const [createEmailFields, setCreateEmailFields] = React.useState({
    subjectContains: "",
    reply: "",
  });

  const [editEmailFields, setEditEmailFields] = React.useState({
    subjectContains: "",
    reply: "",
  });

  const howToExamples = React.useMemo(
    () => ({
      trigger: "email_received",
      condition: '{\n  "subject_contains": "job offer"\n}',
      action: '{\n  "reply": "Thank you — I\'ll review."\n}',
    }),
    [],
  );

  const CUSTOM_TRIGGER_VALUE = "__custom__";

  const triggerOptions = React.useMemo(() => {
    const options = new Set<string>();
    options.add(howToExamples.trigger);
    for (const a of automations) {
      if (a?.trigger) options.add(a.trigger);
    }
    return Array.from(options).filter(Boolean).sort();
  }, [automations, howToExamples.trigger]);

  const safeParseJsonObject = React.useCallback((value: string) => {
    const trimmed = (value ?? "").trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const buildEmailReceivedConditionJson = React.useCallback(
    (subjectContains: string) => {
      const s = (subjectContains ?? "").trim();
      if (!s) return "";
      return JSON.stringify({ subject_contains: s }, null, 2);
    },
    [],
  );

  const buildEmailReceivedActionJson = React.useCallback((reply: string) => {
    const r = (reply ?? "").trim();
    if (!r) return "";
    return JSON.stringify({ reply: r }, null, 2);
  }, []);

  const isValidJsonOrEmpty = React.useCallback((value: string) => {
    const trimmed = (value || "").trim();
    if (!trimmed) return true;
    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleCreateAutomation = () => {
    if (
      !formData.name.trim() ||
      !formData.trigger.trim() ||
      !formData.action.trim()
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!isValidJsonOrEmpty(formData.condition)) {
      toast.error("Condition JSON is invalid");
      return;
    }

    if (!isValidJsonOrEmpty(formData.action)) {
      toast.error("Action JSON is invalid");
      return;
    }

    createAutomation(formData, {
      onSuccess: () => {
        toast.success("Automation created");
        setFormData({
          name: "",
          trigger: "",
          condition: "",
          action: "",
          enabled: true,
        });
        setIsDialogOpen(false);
      },
      onError: () => {
        toast.error("Failed to create automation");
      },
    });
  };

  const handleDeleteAutomation = (id: string) => {
    deleteAutomation(id, {
      onSuccess: () => {
        toast.success("Automation deleted");
      },
      onError: () => {
        toast.error("Failed to delete automation");
      },
    });
  };

  const openEditDialog = (id: string) => {
    const automation = automations.find((a) => a.id === id);
    if (!automation) return;

    setEditingId(id);
    setEditFormData({
      name: automation.name,
      trigger: automation.trigger,
      condition: automation.condition ?? "",
      action: automation.action ?? "",
      enabled: automation.enabled,
    });

    const conditionObj = safeParseJsonObject(automation.condition ?? "");
    const actionObj = safeParseJsonObject(automation.action ?? "");
    setEditEmailFields({
      subjectContains:
        typeof conditionObj?.subject_contains === "string"
          ? (conditionObj.subject_contains as string)
          : "",
      reply:
        typeof actionObj?.reply === "string" ? (actionObj.reply as string) : "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    if (
      !editFormData.name.trim() ||
      !editFormData.trigger.trim() ||
      !editFormData.action.trim()
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!isValidJsonOrEmpty(editFormData.condition)) {
      toast.error("Condition JSON is invalid");
      return;
    }

    if (!isValidJsonOrEmpty(editFormData.action)) {
      toast.error("Action JSON is invalid");
      return;
    }

    updateAutomation(
      {
        id: editingId,
        request: editFormData,
      },
      {
        onSuccess: () => {
          toast.success("Automation updated");
          setIsEditDialogOpen(false);
          setEditingId(null);
        },
        onError: () => {
          toast.error("Failed to update automation");
        },
      },
    );
  };

  const handleToggleEnabled = (id: string, enabled: boolean) => {
    updateAutomation(
      {
        id,
        request: { enabled },
      },
      {
        onError: () => {
          toast.error("Failed to update automation");
        },
      },
    );
  };

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
                <h1 className="text-2xl font-bold">Automations</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage automatic workflows
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus size={16} className="mr-2" />
                Create Automation
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : automations.length === 0 ? (
            <div className="max-w-2xl mx-auto w-full">
              <Card className="glass-dark">
                <CardHeader>
                  <CardTitle className="text-base">
                    How automations work
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    Automations are simple rules: when a trigger happens, Axis
                    can evaluate the optional condition and then apply the
                    action.
                  </p>
                  <div className="space-y-1">
                    <p>
                      1) Choose a{" "}
                      <span className="text-foreground">Trigger type</span>,
                      e.g.{" "}
                      <span className="text-foreground">
                        {howToExamples.trigger}
                      </span>
                    </p>
                    <p>
                      2) (Optional) Add{" "}
                      <span className="text-foreground">Condition JSON</span>
                    </p>
                    <p>
                      3) Add{" "}
                      <span className="text-foreground">Action JSON</span>
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={() => {
                        setFormData({
                          name: "Auto-reply job emails",
                          trigger: howToExamples.trigger,
                          condition: howToExamples.condition,
                          action: howToExamples.action,
                          enabled: true,
                        });
                        setCreateEmailFields({
                          subjectContains: "job offer",
                          reply: "Thank you — I'll review.",
                        });
                        setIsDialogOpen(true);
                      }}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Plus size={16} className="mr-2" />
                      Create your first automation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full space-y-4">
              <Card className="glass-dark">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">
                      How to use automations
                    </CardTitle>
                    <Button
                      size="sm"
                      onClick={() => setIsDialogOpen(true)}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Plus size={14} className="mr-2" />
                      Create
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <p>
                    Create a rule with a trigger type (for example,{" "}
                    <span className="text-foreground">
                      {howToExamples.trigger}
                    </span>
                    ). Paste JSON into Condition/Action fields when you need
                    structured logic.
                  </p>
                </CardContent>
              </Card>

              <div className="grid gap-4 w-full grid-cols-1 md:grid-cols-2">
                {automations.map((automation) => (
                  <Card
                    key={automation.id}
                    className="glass-dark transition-colors hover:bg-accent/40"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-base">
                            {automation.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {automation.trigger}
                            </Badge>
                          </div>
                        </div>
                        <Switch
                          checked={automation.enabled}
                          onCheckedChange={(checked) =>
                            handleToggleEnabled(automation.id, checked)
                          }
                          disabled={isUpdating}
                        />
                      </div>
                    </CardHeader>

                    <CardContent className="pb-4">
                      <div className="space-y-2">
                        {automation.condition && (
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Condition
                            </p>
                            <p className="text-sm text-foreground">
                              {automation.condition}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Action
                          </p>
                          <p className="text-sm text-foreground">
                            {automation.action}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-border hover:bg-accent h-8"
                          onClick={() => openEditDialog(automation.id)}
                        >
                          <Edit2 size={14} className="mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-8"
                          onClick={() => handleDeleteAutomation(automation.id)}
                        >
                          <Trash2 size={14} className="mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <Footer />
      </div>

      {/* Create Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (open) {
            const conditionObj = safeParseJsonObject(formData.condition);
            const actionObj = safeParseJsonObject(formData.action);
            setCreateEmailFields({
              subjectContains:
                typeof conditionObj?.subject_contains === "string"
                  ? (conditionObj.subject_contains as string)
                  : "",
              reply:
                typeof actionObj?.reply === "string"
                  ? (actionObj.reply as string)
                  : "",
            });
          }
        }}
      >
        <DialogContent className="glass-dark max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Create Automation</DialogTitle>
            <DialogDescription>Set up a new automation rule</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-y-auto scrollbar-hidden">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Name *
              </label>
              <Input
                placeholder="My automation"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Trigger type *
              </label>
              <div className="mt-1 space-y-2">
                <Select
                  value={
                    formData.trigger &&
                    triggerOptions.includes(formData.trigger)
                      ? formData.trigger
                      : formData.trigger
                        ? CUSTOM_TRIGGER_VALUE
                        : undefined
                  }
                  onValueChange={(value) => {
                    if (value === CUSTOM_TRIGGER_VALUE) {
                      setFormData({ ...formData, trigger: "" });
                      return;
                    }
                    setFormData({ ...formData, trigger: value });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_TRIGGER_VALUE}>
                      Custom…
                    </SelectItem>
                  </SelectContent>
                </Select>

                {(!formData.trigger ||
                  !triggerOptions.includes(formData.trigger)) && (
                  <Input
                    placeholder={`e.g., ${howToExamples.trigger}`}
                    value={formData.trigger}
                    onChange={(e) =>
                      setFormData({ ...formData, trigger: e.target.value })
                    }
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This describes when the rule should run.
              </p>

              {formData.trigger === "email_received" && (
                <Card className="glass-dark mt-3">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Guided fields (email)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2">
                      <label className="text-xs text-muted-foreground">
                        Subject contains (optional)
                      </label>
                      <Input
                        value={createEmailFields.subjectContains}
                        onChange={(e) =>
                          setCreateEmailFields({
                            ...createEmailFields,
                            subjectContains: e.target.value,
                          })
                        }
                        placeholder="e.g., job offer"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs text-muted-foreground">
                        Reply message (required)
                      </label>
                      <Input
                        value={createEmailFields.reply}
                        onChange={(e) =>
                          setCreateEmailFields({
                            ...createEmailFields,
                            reply: e.target.value,
                          })
                        }
                        placeholder="e.g., Thank you — I'll review."
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            condition: buildEmailReceivedConditionJson(
                              createEmailFields.subjectContains,
                            ),
                            action: buildEmailReceivedActionJson(
                              createEmailFields.reply,
                            ),
                          });
                        }}
                      >
                        Generate JSON
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Condition JSON (optional)
              </label>
              <Textarea
                placeholder={howToExamples.condition}
                value={formData.condition}
                onChange={(e) =>
                  setFormData({ ...formData, condition: e.target.value })
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste JSON here (object or array). Leave blank if you don’t need
                conditions.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Action JSON *
              </label>
              <Textarea
                placeholder={howToExamples.action}
                value={formData.action}
                onChange={(e) =>
                  setFormData({ ...formData, action: e.target.value })
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste JSON describing what should happen.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">
                Enabled
              </label>
              <Switch
                checked={formData.enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, enabled: checked })
                }
              />
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateAutomation}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setEditingId(null);
        }}
      >
        <DialogContent className="glass-dark max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Edit Automation</DialogTitle>
            <DialogDescription>
              Update an existing automation rule
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-y-auto scrollbar-hidden">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Name *
              </label>
              <Input
                placeholder="My automation"
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Trigger type *
              </label>
              <div className="mt-1 space-y-2">
                <Select
                  value={
                    editFormData.trigger &&
                    triggerOptions.includes(editFormData.trigger)
                      ? editFormData.trigger
                      : editFormData.trigger
                        ? CUSTOM_TRIGGER_VALUE
                        : undefined
                  }
                  onValueChange={(value) => {
                    if (value === CUSTOM_TRIGGER_VALUE) {
                      setEditFormData({ ...editFormData, trigger: "" });
                      return;
                    }
                    setEditFormData({ ...editFormData, trigger: value });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_TRIGGER_VALUE}>
                      Custom…
                    </SelectItem>
                  </SelectContent>
                </Select>

                {(!editFormData.trigger ||
                  !triggerOptions.includes(editFormData.trigger)) && (
                  <Input
                    placeholder={`e.g., ${howToExamples.trigger}`}
                    value={editFormData.trigger}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        trigger: e.target.value,
                      })
                    }
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This describes when the rule should run.
              </p>

              {editFormData.trigger === "email_received" && (
                <Card className="glass-dark mt-3">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Guided fields (email)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2">
                      <label className="text-xs text-muted-foreground">
                        Subject contains (optional)
                      </label>
                      <Input
                        value={editEmailFields.subjectContains}
                        onChange={(e) =>
                          setEditEmailFields({
                            ...editEmailFields,
                            subjectContains: e.target.value,
                          })
                        }
                        placeholder="e.g., job offer"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs text-muted-foreground">
                        Reply message (required)
                      </label>
                      <Input
                        value={editEmailFields.reply}
                        onChange={(e) =>
                          setEditEmailFields({
                            ...editEmailFields,
                            reply: e.target.value,
                          })
                        }
                        placeholder="e.g., Thank you — I'll review."
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setEditFormData({
                            ...editFormData,
                            condition: buildEmailReceivedConditionJson(
                              editEmailFields.subjectContains,
                            ),
                            action: buildEmailReceivedActionJson(
                              editEmailFields.reply,
                            ),
                          });
                        }}
                      >
                        Generate JSON
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Condition JSON (optional)
              </label>
              <Textarea
                placeholder={howToExamples.condition}
                value={editFormData.condition}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    condition: e.target.value,
                  })
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste JSON here (object or array). Leave blank if you don’t need
                conditions.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Action JSON *
              </label>
              <Textarea
                placeholder={howToExamples.action}
                value={editFormData.action}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, action: e.target.value })
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste JSON describing what should happen.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">
                Enabled
              </label>
              <Switch
                checked={editFormData.enabled}
                onCheckedChange={(checked) =>
                  setEditFormData({ ...editFormData, enabled: checked })
                }
              />
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
