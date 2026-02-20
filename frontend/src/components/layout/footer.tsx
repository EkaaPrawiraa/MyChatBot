"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { MobileFooterNav } from "@/src/components/layout/mobile-footer-nav";

export function Footer({ className }: { className?: string }) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "border-t border-border bg-background px-6 py-3 text-xs text-muted-foreground",
        className,
      )}
    >
      <MobileFooterNav />
      <div className="flex justify-center">© {year} ekaaprawira</div>
    </footer>
  );
}
