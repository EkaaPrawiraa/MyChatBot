"use client";

import React from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebarVisibility } from "@/src/providers/sidebar-visibility-provider";

type SidebarHeaderToggleProps = {
  className?: string;
};

export function SidebarHeaderToggle({ className }: SidebarHeaderToggleProps) {
  const { isSidebarVisible, toggleSidebar } = useSidebarVisibility();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      aria-label={isSidebarVisible ? "Hide sidebar" : "Show sidebar"}
      className={
        "hidden lg:inline-flex text-muted-foreground hover:text-foreground " +
        (className ?? "")
      }
    >
      <Menu size={18} />
    </Button>
  );
}
