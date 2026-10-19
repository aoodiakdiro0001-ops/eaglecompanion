import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { CreateWorkspaceForm } from "@/components/create-workspace-form";
import {
  ChevronLeftIcon,
  DeviceIcon,
  ShareIcon,
  UsersIcon,
  WifiIcon,
} from "@/components/icons";
import { PairDeviceDialog } from "@/components/pair-device-dialog";
import { DeviceCard, EmptyState, StatCard } from "@/components/ui";
import { listAudit } from "@/lib/audit";
import { auditLabel, metadataSummary } from "@/lib/audit-labels";
import { listDevices } from "@/lib/devices";
import { relativeTime } from "@/lib/format";
import { requireUser } from "@/lib/require-user";
import { listMembers, resolveWorkspace } from "@/lib/workspaces";

export const dynamic = "force-dynamic";
export const metadata = { title: "نظرة عامة" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ws?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const workspace = resolveWorkspace(user.id, params.ws ?? null);

  if (!workspace) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-10">
        <div>
          <p className="eyebrow">البداية</p>
          <h1 className="mt-2 text-2xl font-bold">أنشئ مساحتك الأولى</h1>
          <p className="mt-2 text-sm leading-7 text-muted">
            مساحة العمل تجمع الأجهزة والأعضاء وسجل التدقيق. أنشئ مساحة شخصية أو
            عائلية أو لفريقك.
          </p>
        </div>
        <div className="card p-5">
          <CreateWorkspaceForm />
        </div>
      </div>
    );
  }

  const devices = listDevices(workspace.id);
  const members = listMembers(workspace.id);
  const events = listAudit(workspace.id, 6);
  const online = devices.filter((device) => device.online).length;
  const sharing = devices.filter((device) => device.sharing).length;
  const canManage = workspace.role === "owner" || workspace.role === "member";
  const firstName = user.name.trim().split(/\s+/)[0] ?? user.name;

  return (
    <div className="space-y-8">
      <AutoRefresh />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">لوحة التحكم</p>
          <h1 className="mt-2 text-2xl font-black md:text-3xl">
            أهلاً، {firstName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
            هذه نظرة حية على أجهزة مساحة «{workspace.name}». الحالة تُحدَّث
            تلقائياً، ولا يبدأ أي بث إلا بموافقة الجهاز.
          </p>
        </div>
        <PairDeviceDialog
          workspaceId={workspace.id}
          canManage={canManage}
        />
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="أجهزة متصلة"
          value={online}
          hint={`من أصل ${devices.length} جهاز`}
          icon={WifiIcon}
          tone="accent"
        />
        <StatCard
          label="إجمالي الأجهزة"
          value={devices.length}
          hint="غير الملغاة"
          icon={DeviceIcon}
          tone="brand"
        />
        <StatCard
          label="مشاركات نشطة"
          value={sharing}
          hint="إطار مباشر الآن"
          icon={ShareIcon}
          tone="warn"
        />
        <StatCard
          label="أعضاء المساحة"
          value={members.length}
          hint="مالك وعضو ومشاهد"
          icon={UsersIcon}
          tone="brand"
        />
      </section>

      <section aria-labelledby="devices-title" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="devices-title" className="text-lg font-bold">
              الأجهزة
            </h2>
            <p className="text-xs text-muted">
              اضغط على أي جهاز لعرض التفاصيل والشاشة المباشرة
            </p>
          </div>
          <span className="chip">{devices.length} جهاز</span>
        </div>

        {devices.length === 0 ? (
          <EmptyState
            title="لا توجد أجهزة مقترنة بعد"
            body="ولّد كود اقتران، ثم افتح صفحة الاقتران في متصفح الجهاز الذي تريد إدارته. لا يتم تثبيت أي تطبيق خفي أو منح صلاحيات واسعة."
            action={
              <PairDeviceDialog
                workspaceId={workspace.id}
                canManage={canManage}
              />
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {devices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                href={`/app/devices/${device.id}?ws=${workspace.id}`}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">آخر الأحداث</h2>
              <p className="text-[11px] text-muted">
                كل إجراء حساس يُسجَّل باسم الفاعل ووقته
              </p>
            </div>
            <Link
              href={`/app/audit?ws=${workspace.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-[#7dd3fc]"
            >
              الكل
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            </Link>
          </div>

          {events.length === 0 ? (
            <p className="mt-6 rounded-xl border border-line/60 bg-panel2/30 p-5 text-center text-xs text-muted">
              لا أحداث بعد. سيظهر هنا أول اقتران أو مشاركة.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line/60">
              {events.map((event) => {
                const meta = auditLabel(event.action);
                return (
                  <li
                    key={event.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {meta.label}
                      </p>
                      <p className="truncate text-[11px] text-muted">
                        {event.actor_name ??
                          event.device_name ??
                          metadataSummary(event.metadata) ??
                          "النظام"}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted">
                      {relativeTime(event.created_at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-base font-bold">قبل أن تشارك الشاشة</h2>
          <ul className="mt-3 space-y-3 text-xs leading-6 text-muted">
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              المشاركة تبدأ من الجهاز نفسه، وليس من هذه اللوحة.
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              يظهر شريط أحمر وزر إيقاف على الجهاز طوال المشاركة.
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              لا يتم حفظ الإطارات، وتنتهي الجلسة تلقائياً بعد 10 دقائق.
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
              لا كاميرا، لا ميكروفون، لا رسائل، لا تحكم عن بعد.
            </li>
          </ul>
          <div className="mt-4 rounded-xl border border-brand/20 bg-brand/5 p-3 text-[11px] leading-6 text-muted">
            إن كنت تشارك شاشتك مع فرد آخر، تأكد من إغلاق النوافذ الحساسة قبل
            الموافقة. الإطار يظهر لمن لديه وصول إلى هذه المساحة.
          </div>
        </div>
      </section>
    </div>
  );
}
