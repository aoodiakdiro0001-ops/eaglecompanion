import Link from "next/link";
import { HistoryIcon } from "@/components/icons";
import { formatDateTime, relativeTime } from "@/lib/format";
import { listAudit } from "@/lib/audit";
import {
  auditLabel,
  metadataSummary,
  TONE_CLASSES,
} from "@/lib/audit-labels";
import { requireUser } from "@/lib/require-user";
import { resolveWorkspace } from "@/lib/workspaces";

export const dynamic = "force-dynamic";
export const metadata = { title: "سجل التدقيق" };

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ ws?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const workspace = await resolveWorkspace(user.id, params.ws ?? null);

  if (!workspace) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-muted">أنشئ مساحة عمل أولاً من الإعدادات.</p>
      </div>
    );
  }

  const events = await listAudit(workspace.id, 100);

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">الشفافية</p>
        <h1 className="mt-2 text-2xl font-black md:text-3xl">سجل التدقيق</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
          سجل غير قابل للتعديل من الواجهة لكل الأحداث الحساسة في مساحة «
          {workspace.name}». يُحفظ معرّف الفاعل والجهاز والوقت وعنوان IP.
        </p>
      </header>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/70 px-5 py-4">
          <div className="flex items-center gap-2">
            <HistoryIcon className="h-4 w-4 text-brand" />
            <h2 className="text-base font-bold">آخر 100 حدث</h2>
          </div>
          <span className="chip">{events.length} حدث</span>
        </div>

        {events.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-muted">
            لا أحداث بعد. سيظهر هنا أول اقتران أو مشاركة أو دعوة.
          </p>
        ) : (
          <ol className="divide-y divide-line/60">
            {events.map((event) => {
              const meta = auditLabel(event.action);
              const detail = metadataSummary(event.metadata);
              return (
                <li key={event.id} className="flex gap-3 px-5 py-4">
                  <span
                    className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ${TONE_CLASSES[meta.tone]}`}
                  >
                    <span className="h-2 w-2 rounded-full bg-current" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{meta.label}</p>
                      <span className="text-[10px] text-muted">
                        {relativeTime(event.created_at)} ·{" "}
                        {formatDateTime(event.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {event.actor_name ?? "الجهاز"}
                      {detail ? ` · ${detail}` : ""}
                      {event.ip ? ` · ${event.ip}` : ""}
                    </p>
                    {event.device_id ? (
                      <Link
                        href={`/app/devices/${event.device_id}?ws=${workspace.id}`}
                        className="mt-1 inline-block text-[11px] font-medium text-brand hover:text-[#7dd3fc]"
                      >
                        {event.device_name ?? "عرض الجهاز"}
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
