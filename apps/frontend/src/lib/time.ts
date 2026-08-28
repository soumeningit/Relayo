const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * MINUTE).toISOString();
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();

  if (diff < MINUTE) return "just now";

  const minutes = Math.floor(diff / MINUTE);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(diff / HOUR);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(diff / DAY);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatLatency(ms: number | null): string {
  if (ms === null) return "—";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
