"use client";

import React from "react";
import { useMemorySearch, useRecentMemory } from "@/src/hooks/use-memory";
import { AppSidebar } from "@/src/components/layout/app-sidebar";
import { SidebarHeaderToggle } from "@/src/components/layout/sidebar-header-toggle";
import { Footer } from "@/src/components/layout/footer";
import { ThemeToggle } from "@/src/components/layout/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { Search, Loader2 } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

export default function MemoryPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  const debouncedSetQuery = useDebouncedCallback((value: string) => {
    setDebouncedQuery(value);
  }, 300);

  const { data: searchResults, isLoading: isSearching } = useMemorySearch({
    query: debouncedQuery,
    limit: 50,
  });

  const { data: recentMemory = [], isLoading: isLoadingRecent } =
    useRecentMemory(50);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedSetQuery(value);
  };

  const memories = debouncedQuery
    ? searchResults?.memories || []
    : recentMemory;
  const isLoading = debouncedQuery ? isSearching : isLoadingRecent;

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
                <h1 className="text-2xl font-bold">Memory</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Search and explore long-term memory
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto w-full">
            {/* Tabs */}
            <Tabs defaultValue="search" className="w-full">
              <TabsList className="grid w-full max-w-xs grid-cols-2 mb-6">
                <TabsTrigger value="search">Search</TabsTrigger>
                <TabsTrigger value="recent">Recent</TabsTrigger>
              </TabsList>

              {/* Search Tab */}
              <TabsContent value="search" className="space-y-4">
                <div className="relative mb-6">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    size={20}
                  />
                  <Input
                    placeholder="Search memories..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : memories.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <p className="text-lg font-medium mb-2">
                      {debouncedQuery
                        ? "No memories found"
                        : "Enter a search query"}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    {memories.map((memory) => (
                      <Card
                        key={memory.id}
                        className="glass-dark transition-colors hover:bg-accent/40 cursor-pointer"
                      >
                        <CardContent className="p-4">
                          <p className="text-sm text-foreground line-clamp-3 mb-3">
                            {memory.content}
                          </p>
                          <div className="flex items-center justify-between">
                            {memory.category && (
                              <Badge variant="secondary" className="text-xs">
                                {memory.category}
                              </Badge>
                            )}
                            <p className="text-xs text-muted-foreground ml-auto">
                              {formatDistanceToNow(new Date(memory.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Recent Tab */}
              <TabsContent value="recent" className="space-y-4">
                {isLoadingRecent ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : recentMemory.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <p className="text-lg font-medium mb-2">
                      No recent memories
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    {recentMemory.map((memory) => (
                      <Card
                        key={memory.id}
                        className="glass-dark transition-colors hover:bg-accent/40 cursor-pointer"
                      >
                        <CardContent className="p-4">
                          <p className="text-sm text-foreground line-clamp-3 mb-3">
                            {memory.content}
                          </p>
                          <div className="flex items-center justify-between">
                            {memory.category && (
                              <Badge variant="secondary" className="text-xs">
                                {memory.category}
                              </Badge>
                            )}
                            <p className="text-xs text-muted-foreground ml-auto">
                              {formatDistanceToNow(new Date(memory.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <Footer className="flex-shrink-0" />
      </div>
    </div>
  );
}
