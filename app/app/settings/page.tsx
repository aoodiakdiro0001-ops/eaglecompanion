import Link from "next/link";
import { CreateWorkspaceForm } from "@/components/create-workspace-form";
import {
  AlertIcon,
  CheckIcon,
  KeyIcon,
  LockIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
} from "@/components/icons";
import { LogoutButton } from "@/components/logout-button";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/lib/require-user";
import { listMembers, resolveWorkspace } from "@/lib/workspaces";

export const dynamic = "force-dynamic";
export const metadata = { title: "الإعدادات" };

const ROLE_LABELS: Record<string, string> = {
  owner: "مالك",
  member: "عضو",
  viewer: "مشاهد",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ws?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const workspace = resolveWorkspace(user.id, params.ws ?? null);
  const members = workspace ? listMembers(workspace.id) : [];

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">الحساب</p>
        <h1 className="mt-2 text-2xl font-black md:text-3xl">الإعدادات</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
          معلومات حسابك ومساحاتك، وحدود الأمان التي يعمل بها المنتج.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-brand" />
            <h2 className="text-base font-bold">حسابك</h2>
          </div>
          <dl className="mt-3 space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">الاسم</dt>
              <dd className="font-medium">{user.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">البريد</dt>
              <dd className="font-medium" dir="ltr">
                {user.email}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">تاريخ التسجيل</dt>
              <dd className="font-medium">{formatDateTime(user.created_at)}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <LogoutButton />
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-brand" />
            <h2 className="text-base font-bold">المساحة الحالية</h2>
          </div>
          {workspace ? (
            <>
              <dl className="mt-3 space-y-2.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">الاسم</dt>
                  <dd className="font-medium">{workspace.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">دورك</dt>
                  <dd className="font-medium">
                    {ROLE_LABELS[workspace.role ?? ""] ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">عدد الأعضاء</dt>
                  <dd className="font-medium">{members.length}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/app/members?ws=${workspace.id}`}
                  className="btn-ghost btn-sm"
                >
                  <UsersIcon className="h-4 w-4" />
                  إدارة الأعضاء
                </Link>
                <Link href="/pair" className="btn-ghost btn-sm">
                  <KeyIcon className="h-4 w-4" />
                  اقتران جهاز
                </Link>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">لا توجد مساحة بعد.</p>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-base font-bold">إنشاء مساحة جديدة</h2>
          <p className="mt-1 text-xs leading-6 text-muted">
            استخدم مساحة منفصلة لكل سياق: عائلة، عمل، أو أجهزة شخصية. لا تختلط
            الأجهزة بين المساحات.
          </p>
          <div className="mt-4">
            <CreateWorkspaceForm />
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-center gap-2">
            <ShieldIcon className="h-4 w-4 text-accent" />
            <h2 className="text-base font-bold">حدود الأمان</h2>
          </div>
          <ul className="mt-3 space-y-2.5 text-xs leading-6 text-muted">
            {[
              "كلمات المرور تُخزَّن بـ scrypt، والجلسات بكوكي HttpOnly.",
              "أكواد الاقتران والدعوات تُخزَّن مجزأة وتُستخدم مرة واحدة.",
              "الإطارات في الذاكرة فقط، وتُمحى بعد 5 ثوانٍ من آخر إطار.",
              "جلسة المشاركة تنتهي تلقائياً بعد 10 دقائق.",
              "لا كاميرا أو ميكروفون أو رسائل أو تحكم عن بعد.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/5 p-3 text-[11px] leading-6 text-muted">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            هذه الأداة مخصصة للأجهزة التي تملكها أو لديك إذن صريح لإدارتها.
            استخدامها لمراقبة شخص دون علمه مخالف ويمنع منعاً باتاً.
          </div>
        </section>
      </div>

      <section className="card p-5">
        <div className="flex items-center gap-2">
          <LockIcon className="h-4 w-4 text-brand" />
          <h2 className="text-base font-bold">الخصوصية</h2>
        </div>
        <p className="mt-2 max-w-3xl text-xs leading-7 text-muted">
          لا يحتوي المنتج على أي آلية للعمل في الخلفية دون إشعار، ولا يقرأ
          الرسائل أو سجل المكالمات أو جهات الاتصال أو الملفات، ولا يشغّل الكاميرا
          أو الميكروفون. مشاركة الشاشة تتطلب وجود صفحة الجهاز مفتوحة، ونقرة
          صريحة، وموافقة المتصفح، ويمكن إيقافها من الجهاز في أي لحظة.
        </p>
      </section>
    </div>
  );
}
