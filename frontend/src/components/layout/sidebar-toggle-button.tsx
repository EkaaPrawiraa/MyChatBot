"use client";

import React from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebarVisibility } from "@/src/providers/sidebar-visibility-provider";

export function SidebarToggleButton() {
  const { isSidebarVisible, toggleSidebar } = useSidebarVisibility();

  return (
    <div className="hidden lg:flex fixed top-4 left-4 z-50">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        aria-label={isSidebarVisible ? "Hide sidebar" : "Show sidebar"}
        className="text-muted-foreground hover:text-foreground"
      >
        <Menu size={18} />
      </Button>
    </div>
  );
}
