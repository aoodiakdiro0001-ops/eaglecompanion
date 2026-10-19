import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertIcon,
  BatteryIcon,
  ChevronLeftIcon,
  ClockIcon,
  DeviceIcon,
  GlobeIcon,
  LockIcon,
  MonitorIcon,
  WifiIcon,
} from "@/components/icons";
import { LiveViewer, type ShareInfo } from "@/components/live-viewer";
import { RevokeButton } from "@/components/revoke-button";
import { StatCard, StatusBadge } from "@/components/ui";
import { listAudit } from "@/lib/audit";
import { auditLabel, metadataSummary, TONE_CLASSES } from "@/lib/audit-labels";
import { getDeviceForUser } from "@/lib/devices";
import { formatBattery, formatDateTime, relativeTime } from "@/lib/format";
import { requireUser } from "@/lib/require-user";
import { activeShare, isShareLive } from "@/lib/share";

export const dynamic = "force-dynamic";
export const metadata = { title: "تفاصيل الجهاز" };

const ROLE_LABELS: Record<string, string> = {
  owner: "مالك",
  member: "عضو",
  viewer: "مشاهد",
};

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/50 py-2.5 last:border-0">
      <dt className="shrink-0 text-xs text-muted">{label}</dt>
      <dd
        className={`min-w-0 break-words text-end text-xs font-medium text-ink ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

export default async function DevicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const found = await getDeviceForUser(user.id, id);
  if (!found) notFound();

  const { device, role } = found;
  const workspaceId = device.workspace_id;
  const share = await activeShare(device.id);
  const initialShare: ShareInfo | null = share
    ? {
        id: share.id,
        startedAt: share.started_at,
        expiresAt: share.expires_at,
        lastFrameAt: share.last_frame_at,
        framesCount: share.frames_count,
        live: isShareLive(share),
      }
    : null;
  const canManage = role === "owner" || role === "member";
  const sharingLive = isShareLive(share);
  const online = device.revoked_at === null && device.last_seen_at !== null
    ? Date.now() - device.last_seen_at <= 45_000
    : false;
  const deviceEvents = (await listAudit(workspaceId, 200))
    .filter((event) => event.device_id === device.id)
    .slice(0, 12);

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-xs text-muted" aria-label="مسار التنقل">
        <Link href={`/app?ws=${workspaceId}`} className="hover:text-ink">
          الأجهزة
        </Link>
        <ChevronLeftIcon className="h-3.5 w-3.5" />
        <span className="text-ink">{device.name}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20">
            <DeviceIcon className="h-7 w-7" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black">{device.name}</h1>
              {device.revoked_at ? (
                <span className="chip-danger">ملغى</span>
              ) : (
                <StatusBadge online={online} />
              )}
            </div>
            <p className="mt-1 text-xs text-muted">
              {device.platform ?? "جهاز"} · آخر ظهور{" "}
              {relativeTime(device.last_seen_at)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="chip">دورك: {ROLE_LABELS[role] ?? role}</span>
              {sharingLive ? (
                <span className="chip-warn">مشاركة شاشة نشطة</span>
              ) : null}
              <span className="chip">
                <LockIcon className="h-3.5 w-3.5" />
                لا وصول خفي
              </span>
            </div>
          </div>
        </div>
      </header>

      {device.revoked_at ? (
        <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          تم إلغاء وصول هذا الجهاز في {formatDateTime(device.revoked_at)}. لن
          يستقبل الخادم أي نبضات أو إطارات جديدة منه.
        </div>
      ) : null}

      <LiveViewer
        deviceId={device.id}
        initialShare={initialShare}
        revoked={device.revoked_at !== null}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="البطارية"
          value={formatBattery(device.battery_level)}
          hint={device.battery_charging ? "متصل بالشاحن" : "غير معروف"}
          icon={BatteryIcon}
          tone="accent"
        />
        <StatCard
          label="الشبكة"
          value={device.network_type ?? "غير معروفة"}
          hint="آخر قيمة أرسلها الجهاز"
          icon={WifiIcon}
          tone="brand"
        />
        <StatCard
          label="الشاشة"
          value={
            device.screen_w && device.screen_h
              ? `${device.screen_w}×${device.screen_h}`
              : "غير معروفة"
          }
          hint="دقة العرض"
          icon={MonitorIcon}
          tone="brand"
        />
        <StatCard
          label="آخر نبضة"
          value={relativeTime(device.last_seen_at)}
          hint={device.last_seen_at ? formatDateTime(device.last_seen_at) : "لم يتصل"}
          icon={ClockIcon}
          tone={online ? "accent" : "warn"}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center gap-2">
            <GlobeIcon className="h-4 w-4 text-brand" />
            <h2 className="text-base font-bold">معلومات الجهاز</h2>
          </div>
          <dl className="mt-3">
            <InfoRow label="المنصة" value={device.platform ?? "غير معروفة"} />
            <InfoRow label="الطراز" value={device.model ?? "غير معروف"} />
            <InfoRow
              label="مقاس الشاشة"
              value={
                device.screen_w && device.screen_h
                  ? `${device.screen_w} × ${device.screen_h}`
                  : "غير معروف"
              }
            />
            <InfoRow label="تاريخ الاقتران" value={formatDateTime(device.paired_at)} />
            <InfoRow
              label="آخر ظهور"
              value={device.last_seen_at ? formatDateTime(device.last_seen_at) : "لم يتصل"}
            />
            <InfoRow
              label="وكيل المستخدم"
              value={device.user_agent ?? "غير معروف"}
              mono
            />
          </dl>
        </section>

        <section className="card p-5">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-brand" />
            <h2 className="text-base font-bold">سجل هذا الجهاز</h2>
          </div>
          {deviceEvents.length === 0 ? (
            <p className="mt-4 rounded-xl border border-line/60 bg-panel2/30 p-5 text-center text-xs text-muted">
              لا أحداث لهذا الجهاز بعد.
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {deviceEvents.map((event) => {
                const meta = auditLabel(event.action);
                return (
                  <li key={event.id} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ring-1 ${TONE_CLASSES[meta.tone]}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold">{meta.label}</p>
                        <span className="shrink-0 text-[10px] text-muted">
                          {relativeTime(event.created_at)}
                        </span>
                      </div>
                      <p className="truncate text-[10px] text-muted">
                        {event.actor_name ?? metadataSummary(event.metadata) ?? "الجهاز"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="card border-danger/20 p-5">
        <h2 className="text-sm font-bold text-danger">منطقة الخطر</h2>
        <p className="mt-1 max-w-2xl text-xs leading-6 text-muted">
          إلغاء الجهاز يوقف كل اتصالاته فوراً ويُنهي أي مشاركة نشطة. لا يمكن
          التراجع عن الإلغاء من هذه الصفحة؛ ستحتاج إلى اقتران جديد بكود جديد.
        </p>
        <div className="mt-3">
          {device.revoked_at ? (
            <span className="chip">تم الإلغاء مسبقاً</span>
          ) : canManage ? (
            <RevokeButton deviceId={device.id} workspaceId={workspaceId} />
          ) : (
            <span className="chip">إلغاء الجهاز متاح للمالك والعضو فقط</span>
          )}
        </div>
      </section>
    </div>
  );
}
