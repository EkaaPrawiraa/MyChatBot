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
import { Switch } from "@/components/ui/switch";
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

  const handleCreateAutomation = () => {
    if (
      !formData.name.trim() ||
      !formData.trigger.trim() ||
      !formData.action.trim()
    ) {
      toast.error("Please fill in all required fields");
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
            <div className="text-center text-muted-foreground py-20">
              <p className="text-lg font-medium mb-2">No automations yet</p>
              <p className="text-sm">
                Create your first automation to get started
              </p>
            </div>
          ) : (
            <div className="grid gap-4 max-w-4xl mx-auto w-full grid-cols-1 md:grid-cols-2">
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
                        <p className="text-xs text-muted-foreground">Action</p>
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
          )}
        </div>

        <Footer />
      </div>

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-dark">
          <DialogHeader>
            <DialogTitle>Create Automation</DialogTitle>
            <DialogDescription>Set up a new automation rule</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Name
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
                Trigger
              </label>
              <Input
                placeholder="e.g., daily, on_message, on_reminder"
                value={formData.trigger}
                onChange={(e) =>
                  setFormData({ ...formData, trigger: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Condition (Optional)
              </label>
              <Input
                placeholder="e.g., if time > 9:00"
                value={formData.condition}
                onChange={(e) =>
                  setFormData({ ...formData, condition: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Action
              </label>
              <Input
                placeholder="e.g., send_notification, log_activity"
                value={formData.action}
                onChange={(e) =>
                  setFormData({ ...formData, action: e.target.value })
                }
                className="mt-1"
              />
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

          <DialogFooter>
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
        <DialogContent className="glass-dark">
          <DialogHeader>
            <DialogTitle>Edit Automation</DialogTitle>
            <DialogDescription>
              Update an existing automation rule
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Name
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
                Trigger
              </label>
              <Input
                placeholder="e.g., daily, on_message, on_reminder"
                value={editFormData.trigger}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, trigger: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Condition (Optional)
              </label>
              <Input
                placeholder="e.g., if time > 9:00"
                value={editFormData.condition}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    condition: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Action
              </label>
              <Input
                placeholder="e.g., send_notification, log_activity"
                value={editFormData.action}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, action: e.target.value })
                }
                className="mt-1"
              />
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

          <DialogFooter>
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
