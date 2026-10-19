export type AuditTone = "brand" | "accent" | "warn" | "danger" | "muted";

export const AUDIT_LABELS: Record<
  string,
  { label: string; tone: AuditTone }
> = {
  "workspace.create": { label: "إنشاء مساحة عمل", tone: "brand" },
  "device.pair": { label: "اقتران جهاز", tone: "accent" },
  "device.revoke": { label: "إلغاء وصول جهاز", tone: "danger" },
  "share.start": { label: "بدء مشاركة شاشة", tone: "warn" },
  "share.stop": { label: "إيقاف مشاركة شاشة", tone: "muted" },
  "invite.create": { label: "إنشاء دعوة عضو", tone: "brand" },
  "member.join": { label: "انضمام عضو", tone: "accent" },
};

export function auditLabel(action: string): { label: string; tone: AuditTone } {
  return AUDIT_LABELS[action] ?? { label: action, tone: "muted" };
}

export function parseMetadata(
  raw: string | null,
): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function metadataSummary(raw: string | null): string | null {
  const metadata = parseMetadata(raw);
  if (!metadata) return null;
  if (typeof metadata.name === "string") return metadata.name;
  if (typeof metadata.role === "string") {
    return metadata.role === "member"
      ? "دور: عضو"
      : metadata.role === "viewer"
        ? "دور: مشاهد"
        : `دور: ${metadata.role}`;
  }
  return null;
}

export const TONE_CLASSES: Record<AuditTone, string> = {
  brand: "bg-brand/10 text-brand ring-brand/20",
  accent: "bg-accent/10 text-accent ring-accent/20",
  warn: "bg-warn/10 text-warn ring-warn/20",
  danger: "bg-danger/10 text-danger ring-danger/20",
  muted: "bg-panel2 text-muted ring-line",
};
