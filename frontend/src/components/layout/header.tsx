"use client";

import React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  title?: string;
  showSearch?: boolean;
  onSearchChange?: (value: string) => void;
}

export function Header({ title, showSearch, onSearchChange }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between gap-4">
      {/* Left Section */}
      <div className="flex items-center gap-4 flex-1">
        {/* Title */}
        {title && (
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Search */}
        {showSearch && (
          <div className="hidden md:flex items-center">
            <div className="relative w-64">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={18}
              />
              <Input
                placeholder="Search..."
                className="pl-10 h-10"
                onChange={(e) => onSearchChange?.(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Theme Toggle */}
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </Button>
        )}
      </div>
    </header>
  );
}
