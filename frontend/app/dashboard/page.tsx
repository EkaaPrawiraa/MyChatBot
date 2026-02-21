"use client";

import React from "react";
import Image from "next/image";
import { AppSidebar } from "@/src/components/layout/app-sidebar";
import { SidebarHeaderToggle } from "@/src/components/layout/sidebar-header-toggle";
import { Footer } from "@/src/components/layout/footer";
import { ThemeToggle } from "@/src/components/layout/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import axisLogo from "@/AxisAssistant.png";

const SLIDE_COUNT = 4;

export default function DashboardPage() {
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const slideRefs = React.useRef<Array<HTMLElement | null>>([]);
  const [activeSlide, setActiveSlide] = React.useState(0);

  React.useEffect(() => {
    const root = viewportRef.current;
    if (!root) return;

    const slides = slideRefs.current.filter(Boolean) as HTMLElement[];
    if (slides.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0),
          );
        const top = visible[0];
        if (!top?.target) return;
        const idx = slides.findIndex((s) => s === top.target);
        if (idx >= 0) setActiveSlide(idx);
      },
      { root, threshold: [0.55, 0.7, 0.85] },
    );

    slides.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex h-screen">
      <AppSidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="bg-background border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <SidebarHeaderToggle className="mt-0.5" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Swipe to explore
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-6">
          <div className="max-w-5xl mx-auto w-full h-full relative">
            <div className="absolute left-0 right-0 bottom-3 z-10 flex justify-center">
              <div
                className="rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
                role="status"
                aria-label={`Slide ${activeSlide + 1} of ${SLIDE_COUNT}`}
              >
                <span className="sr-only">
                  Slide {activeSlide + 1} of {SLIDE_COUNT}
                </span>
                <div className="flex items-center gap-2" aria-hidden="true">
                  {Array.from({ length: SLIDE_COUNT }).map((_, idx) => (
                    <span
                      key={idx}
                      className={
                        "h-2 w-2 rounded-full transition-colors " +
                        (idx === activeSlide
                          ? "bg-foreground"
                          : "bg-muted-foreground/30")
                      }
                    />
                  ))}
                </div>
              </div>
            </div>

            <div
              ref={viewportRef}
              className="h-full flex gap-4 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth pr-2 pt-2 pb-10 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
              aria-label="Dashboard carousel"
            >
              <section
                ref={(el) => {
                  slideRefs.current[0] = el;
                }}
                className={
                  "snap-center shrink-0 w-full h-full transition-all duration-500 " +
                  (activeSlide === 0
                    ? "opacity-100 scale-100"
                    : "opacity-50 scale-[0.98]")
                }
              >
                <Card className="glass-dark h-full border border-border/70">
                  <CardContent className="p-6 md:p-10 h-full flex flex-col justify-center">
                    <div className="mb-5">
                      <Image
                        src={axisLogo}
                        alt="aXis Assistant logo"
                        priority
                        className="w-full max-w-xl mx-auto h-auto max-h-40 md:max-h-52 object-contain"
                      />
                    </div>
                    <Badge variant="secondary" className="mb-4 w-fit">
                      aXis Assistant
                    </Badge>
                    <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
                      Welcome
                    </h2>
                    <p className="text-muted-foreground mt-3 max-w-2xl text-base md:text-lg">
                      aXis (X&apos;s) Assistant is your chat-first workspace to
                      plan, act, and keep context across tools.
                    </p>
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-lg border border-border bg-card/40 p-4">
                        <div className="text-sm font-medium">Chat-first</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Ask, iterate, and get results fast.
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-card/40 p-4">
                        <div className="text-sm font-medium">Tool-aware</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Connect integrations when you&apos;re ready.
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-card/40 p-4">
                        <div className="text-sm font-medium">Traceable</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Review Activities anytime.
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section
                ref={(el) => {
                  slideRefs.current[1] = el;
                }}
                className={
                  "snap-center shrink-0 w-full h-full transition-all duration-500 " +
                  (activeSlide === 1
                    ? "opacity-100 scale-100"
                    : "opacity-50 scale-[0.98]")
                }
              >
                <Card className="glass-dark h-full border border-border/70">
                  <CardContent className="p-6 md:p-10 h-full flex flex-col justify-center">
                    <h3 className="text-2xl font-semibold">How to use</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                      Start in Chat, then review outcomes in Activities.
                    </p>

                    <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-lg border border-border bg-card/40 p-4">
                        <div className="text-sm font-medium">
                          1) Create a session
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Go to Chat and start a new conversation.
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-card/40 p-4">
                        <div className="text-sm font-medium">
                          2) Ask clearly
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Provide context and your desired outcome.
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-card/40 p-4">
                        <div className="text-sm font-medium">3) Review</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Check Activities for confirmation.
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 rounded-lg border border-border bg-card/40 p-4">
                      <div className="text-sm font-medium">Tip</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Use Settings to enable/disable sidebar menus and connect
                        integrations.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section
                ref={(el) => {
                  slideRefs.current[2] = el;
                }}
                className={
                  "snap-center shrink-0 w-full h-full transition-all duration-500 " +
                  (activeSlide === 2
                    ? "opacity-100 scale-100"
                    : "opacity-50 scale-[0.98]")
                }
              >
                <Card className="glass-dark h-full border border-border/70">
                  <CardContent className="p-6 md:p-10 h-full flex flex-col justify-center">
                    <h3 className="text-2xl font-semibold">
                      Things you can do
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                      Use aXis Assistant to manage work across features.
                    </p>

                    <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-lg border border-border bg-card/40 p-4">
                        <div className="text-sm font-medium">Activities</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          See what the assistant did and why.
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-card/40 p-4">
                        <div className="text-sm font-medium">Planning</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Visualize plans derived from activities.
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-card/40 p-4">
                        <div className="text-sm font-medium">Memory</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Search stored information and context.
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-card/40 p-4">
                        <div className="text-sm font-medium">Automations</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Create workflow rules and triggers.
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section
                ref={(el) => {
                  slideRefs.current[3] = el;
                }}
                className={
                  "snap-center shrink-0 w-full h-full transition-all duration-500 " +
                  (activeSlide === 3
                    ? "opacity-100 scale-100"
                    : "opacity-50 scale-[0.98]")
                }
              >
                <Card className="glass-dark h-full border border-border/70">
                  <CardContent className="p-6 md:p-10 h-full flex flex-col justify-center">
                    <h3 className="text-2xl font-semibold">
                      Future improvements
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                      More power, more integrations, and smoother automation.
                    </p>

                    <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-lg border border-border bg-card/40 p-4">
                        <div className="text-sm font-medium">
                          More integrations
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Expand beyond current providers and channels.
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-card/40 p-4">
                        <div className="text-sm font-medium">Better safety</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Clearer context and safer execution.
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-card/40 p-4">
                        <div className="text-sm font-medium">
                          Smarter memory
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Better recall, tagging, and search.
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-card/40 p-4">
                        <div className="text-sm font-medium">
                          Automation depth
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          More triggers, conditions, and actions.
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>
            </div>
          </div>
        </div>

        <Footer className="flex-shrink-0" />
      </div>
    </div>
  );
}
