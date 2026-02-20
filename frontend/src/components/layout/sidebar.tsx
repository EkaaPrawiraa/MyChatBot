"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useProfile } from "@/src/hooks/use-profile";
import {
  DEFAULT_SIDEBAR_MENUS,
  SIDEBAR_MENU_ITEMS,
  type SidebarMenuKey,
} from "@/src/lib/sidebar-menus";

import axisLogo from "../../../AxisAssistantLogo.png";

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: profile } = useProfile();

  const menuVisibility = React.useMemo(() => {
    const raw = profile?.sidebarMenus || {};
    const merged: Record<SidebarMenuKey, boolean> = {
      ...DEFAULT_SIDEBAR_MENUS,
      ...(raw as any),
    };

    // Always keep these visible.
    merged.chat = true;
    merged.settings = true;
    return merged;
  }, [profile?.sidebarMenus]);

  const navItems = React.useMemo(() => {
    return SIDEBAR_MENU_ITEMS.filter((item) => {
      if (item.locked) return true;
      return menuVisibility[item.key] !== false;
    });
  }, [menuVisibility]);

  return (
    <aside className="w-full h-full flex flex-col px-4 pt-6 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Logo */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
          onClick={onClose}
        >
          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-transparent">
            <Image
              src={axisLogo}
              alt="aXis Assistant logo"
              fill
              sizes="40px"
              className="object-cover object-left"
              priority
            />
          </div>
          <span className="font-bold text-lg hidden sm:block tracking-tight">
            aXis Assistant
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200",
                isActive
                  ? "nav-active"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              <Icon size={20} />
              <span className="hidden sm:block text-sm font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
