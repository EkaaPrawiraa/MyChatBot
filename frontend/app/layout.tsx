import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/src/providers/query-provider";
import { SidebarVisibilityProvider } from "@/src/providers/sidebar-visibility-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "aXis Assistant",
  description: "AI-powered assistant dashboard",
  generator: "aXis Assistant",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <SidebarVisibilityProvider>
            <QueryProvider>
              {children}
              <Toaster />
            </QueryProvider>
          </SidebarVisibilityProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
