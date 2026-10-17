export const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function timeAgo(ts: number, now = Date.now()): string {
  const seconds = Math.round((ts - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export const dateTime = (ts: number) =>
  new Date(ts).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

export const initials = (first: string, last: string, email: string) =>
  ((first[0] ?? "") + (last[0] ?? "") || email[0] || "?").toUpperCase();
