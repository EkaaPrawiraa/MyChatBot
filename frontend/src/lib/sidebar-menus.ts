import {
  MessageSquare,
  LayoutDashboard,
  Activity,
  Brain,
  Calendar,
  Users,
  Zap,
  Settings,
} from "lucide-react";

export type SidebarMenuKey =
  | "dashboard"
  | "chat"
  | "activities"
  | "calendar"
  | "planning"
  | "contacts"
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
  memory: true,
  automations: true,
  email: true,
  whatsapp: true,
  settings: true,
};
