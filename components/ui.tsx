import Link from "next/link";
import type { DeviceView } from "@/types";
import { formatBattery, relativeTime } from "@/lib/format";
import {
  BatteryIcon,
  ChevronLeftIcon,
  DeviceIcon,
  WifiIcon,
} from "./icons";

export function StatusBadge({ online }: { online: boolean }) {
  return online ? (
    <span className="chip-success">
      <span className="h-1.5 w-1.5 animate-pulseSoft rounded-full bg-accent" />
      متصل
    </span>
  ) : (
    <span className="chip">
      <span className="h-1.5 w-1.5 rounded-full bg-muted/60" />
      غير متصل
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "brand" | "accent" | "warn" | "danger";
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand/10 text-brand ring-brand/20",
    accent: "bg-accent/10 text-accent ring-accent/20",
    warn: "bg-warn/10 text-warn ring-warn/20",
    danger: "bg-danger/10 text-danger ring-danger/20",
  };
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted">{label}</p>
          <p className="mt-2 text-2xl font-black text-ink">{value}</p>
          {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
        </div>
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl ring-1 ${tones[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20">
        <DeviceIcon className="h-7 w-7" />
      </span>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-7 text-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function DeviceCard({
  device,
  href,
}: {
  device: DeviceView;
  href: string;
}) {
  const battery = device.battery_level;
  const batteryTone =
    battery === null
      ? "bg-muted/40"
      : battery <= 20
        ? "bg-danger"
        : battery <= 50
          ? "bg-warn"
          : "bg-accent";

  return (
    <Link
      href={href}
      className="card group block p-5 transition hover:border-brand/40 hover:shadow-glow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20">
            <DeviceIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{device.name}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted">
              {device.platform ?? "جهاز"} · {relativeTime(device.last_seen_at)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {device.sharing ? (
            <span className="chip-warn">
              <span className="h-1.5 w-1.5 animate-pulseSoft rounded-full bg-warn" />
              مشاركة
            </span>
          ) : null}
          <StatusBadge online={device.online} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line/70 bg-panel2/40 p-3">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <BatteryIcon className="h-3.5 w-3.5" />
              البطارية
            </span>
            <span className="font-semibold text-ink">
              {formatBattery(device.battery_level)}
              {device.battery_charging ? " · تشحن" : ""}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line/70">
            <div
              className={`h-full rounded-full ${batteryTone}`}
              style={{ width: `${battery ?? 0}%` }}
            />
          </div>
        </div>
        <div className="rounded-xl border border-line/70 bg-panel2/40 p-3">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <WifiIcon className="h-3.5 w-3.5" />
              الشبكة
            </span>
            <span className="font-semibold text-ink">
              {device.network_type ?? "غير معروف"}
            </span>
          </div>
          <p className="mt-2 truncate text-[11px] text-muted">
            {device.screen_w && device.screen_h
              ? `${device.screen_w} × ${device.screen_h}`
              : "مقاس الشاشة غير معروف"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted">
        <span>عرض التفاصيل</span>
        <ChevronLeftIcon className="h-4 w-4 transition group-hover:-translate-x-0.5" />
      </div>
    </Link>
  );
}
