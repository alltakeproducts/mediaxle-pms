import {
  LayoutDashboard,
  Boxes,
  Users,
  ClipboardCheck,
  FileText,
  Settings,
  type LucideIcon,
} from "lucide-react";

/** Cookie name for the auth session token. */
export const SESSION_COOKIE = "pt_session";

/** Default score scale used when a tracker doesn't override it. */
export const DEFAULT_SCORE_MIN = 0;
export const DEFAULT_SCORE_MAX = 5;

/** Pagination default page size for tables. */
export const DEFAULT_PAGE_SIZE = 10;

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Match nested routes (e.g. /trackers/123) for active highlighting. */
  matchPrefix?: boolean;
}

/** Primary sidebar navigation. Single source of truth. */
export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Trackers", href: "/trackers", icon: Boxes, matchPrefix: true },
  { title: "Trainees", href: "/trainees", icon: Users, matchPrefix: true },
  {
    title: "Assessments",
    href: "/assessments",
    icon: ClipboardCheck,
    matchPrefix: true,
  },
  { title: "Reports", href: "/reports", icon: FileText, matchPrefix: true },
  { title: "Settings", href: "/settings", icon: Settings },
];

/** Public routes that do not require authentication. */
export const PUBLIC_ROUTES = ["/login"];

/** Theme color presets offered when creating a tracker. */
export const THEME_COLOR_PRESETS = [
  "#4f46e5", // indigo
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
];
