import {
  MessageSquare,
  LayoutDashboard,
  Activity,
  FileText,
  Brain,
  Calendar,
  Users,
  Zap,
  Settings,
  Youtube,
  Share2,
  Globe,
} from "lucide-react";
import { XLogoIcon } from "@/src/components/icons/brands";

export type SidebarMenuKey =
  | "dashboard"
  | "chat"
  | "activities"
  | "calendar"
  | "planning"
  | "contacts"
  | "documents"
  | "youtubeAnalytics"
  | "webSearch"
  | "social"
  | "x"
  | "memory"
  | "automations"
  | "email"
  | "whatsapp"
  | "settings";

export type SidebarMenuItem = {
  key: SidebarMenuKey;
  label: string;
  href: string;
  icon: any;
  locked?: boolean;
};

export const SIDEBAR_MENU_ITEMS: SidebarMenuItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "chat",
    label: "Chat",
    href: "/chat",
    icon: MessageSquare,
    locked: true,
  },
  {
    key: "activities",
    label: "Activities",
    href: "/activities",
    icon: Activity,
  },
  { key: "calendar", label: "Calendar", href: "/calendar", icon: Calendar },
  { key: "planning", label: "Planning", href: "/planning", icon: Activity },
  { key: "contacts", label: "Contacts", href: "/contacts", icon: Users },
  { key: "documents", label: "Documents", href: "/documents", icon: FileText },
  {
    key: "youtubeAnalytics",
    label: "YouTube Analytics",
    href: "/youtube-analytics",
    icon: Youtube,
  },
  { key: "webSearch", label: "Web Search", href: "/web-search", icon: Globe },
  { key: "social", label: "Social", href: "/social", icon: Share2 },
  { key: "x", label: "X", href: "/x", icon: XLogoIcon },
  { key: "memory", label: "Memory", href: "/memory", icon: Brain },
  { key: "automations", label: "Automations", href: "/automations", icon: Zap },
  { key: "email", label: "Email", href: "/email", icon: MessageSquare },
  {
    key: "whatsapp",
    label: "WhatsApp",
    href: "/whatsapp",
    icon: MessageSquare,
  },
  {
    key: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
    locked: true,
  },
];

export const DEFAULT_SIDEBAR_MENUS: Record<SidebarMenuKey, boolean> = {
  dashboard: true,
  chat: true,
  activities: true,
  calendar: true,
  planning: true,
  contacts: true,
  documents: true,
  youtubeAnalytics: true,
  webSearch: true,
  social: true,
  x: true,
  memory: true,
  automations: true,
  email: true,
  whatsapp: true,
  settings: true,
};
