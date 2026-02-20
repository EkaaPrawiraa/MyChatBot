"use client";

import React from "react";
import { AppSidebar } from "@/src/components/layout/app-sidebar";
import { Header } from "./header";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  showSearch?: boolean;
  onSearchChange?: (value: string) => void;
}

export function AppLayout({
  children,
  title,
  showSearch,
  onSearchChange,
}: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - Hidden on mobile */}
      <AppSidebar />

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0">
          <Header
            title={title}
            showSearch={showSearch}
            onSearchChange={onSearchChange}
          />
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
