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
    icon: [{ url: "/axisasssistantlogo.png" }],
    apple: "/axisasssistantlogo.png",
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
