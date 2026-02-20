"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useProfile } from "@/src/hooks/use-profile";
import {
  DEFAULT_SIDEBAR_MENUS,
  SIDEBAR_MENU_ITEMS,
  type SidebarMenuKey,
} from "@/src/lib/sidebar-menus";

export function MobileFooterNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const { data: profile } = useProfile();

  const menuVisibility = React.useMemo(() => {
    const raw = profile?.sidebarMenus || {};
    const merged: Record<SidebarMenuKey, boolean> = {
      ...DEFAULT_SIDEBAR_MENUS,
      ...(raw as any),
    };

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
    <nav aria-label="Primary" className={cn("lg:hidden", className)}>
      <div className="-mx-6 px-6 pb-2 pt-1 overflow-x-auto">
        <div className="flex items-center gap-2 flex-nowrap">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 inline-flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 transition-colors",
                  isActive
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={18} />
                <span className="text-[11px] font-medium leading-none whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
