const relative = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });
const dateTime = new Intl.DateTimeFormat("ar", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function relativeTime(
  timestamp: number | null,
  nowMs = Date.now(),
): string {
  if (!timestamp) return "لم يتصل بعد";
  const diff = timestamp - nowMs;
  const abs = Math.abs(diff);
  if (abs < 5_000) return "الآن";
  if (abs < 60_000) return relative.format(Math.round(diff / 1000), "second");
  if (abs < 3_600_000) return relative.format(Math.round(diff / 60_000), "minute");
  if (abs < 86_400_000) return relative.format(Math.round(diff / 3_600_000), "hour");
  return relative.format(Math.round(diff / 86_400_000), "day");
}

export function formatDateTime(timestamp: number): string {
  return dateTime.format(new Date(timestamp));
}

export function formatBattery(level: number | null): string {
  if (level === null) return "غير معروف";
  return `${level}%`;
}

export function shortUserAgent(userAgent: string | null): string {
  if (!userAgent) return "غير معروف";
  return userAgent.length > 90 ? `${userAgent.slice(0, 90)}...` : userAgent;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
}
