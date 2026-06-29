import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names with conflict resolution.
 * Used by every shadcn/ui primitive.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Build a URL-safe slug from an arbitrary string. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Stable string for a Mongo ObjectId / document id. */
export function toId(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "toString" in (value as object)) {
    return String(value);
  }
  return String(value);
}

/** Format a date as `dd MMM yyyy` without pulling a locale lib for trivial cases. */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Format a date-time as `dd MMM yyyy, HH:mm`. */
export function formatDateTime(date: Date | string | number): string {
  const d = new Date(date);
  return `${formatDate(d)}, ${d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/** Normalise a Date to midnight UTC — used so an "assessment date" is day-stable. */
export function startOfUtcDay(date: Date = new Date()): Date {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Parse a comma/newline separated list of emails into a clean array. */
export function parseEmailList(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split(/[\n,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
