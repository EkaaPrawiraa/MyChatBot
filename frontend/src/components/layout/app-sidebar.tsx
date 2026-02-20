"use client";

import React from "react";
import { Sidebar } from "@/src/components/layout/sidebar";
import { useSidebarVisibility } from "@/src/providers/sidebar-visibility-provider";

export function AppSidebar() {
  const { isSidebarVisible } = useSidebarVisibility();

  if (!isSidebarVisible) return null;

  return (
    <div className="hidden lg:flex w-[280px] flex-col flex-shrink-0">
      <Sidebar />
    </div>
  );
}
