import { InvitePanel, JoinWorkspacePanel } from "@/components/members-panel";
import { UsersIcon } from "@/components/icons";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/lib/require-user";
import { listMembers, resolveWorkspace } from "@/lib/workspaces";

export const dynamic = "force-dynamic";
export const metadata = { title: "الأعضاء" };

const ROLE_LABELS: Record<string, string> = {
  owner: "مالك",
  member: "عضو",
  viewer: "مشاهد",
};

const ROLE_TONES: Record<string, string> = {
  owner: "chip border-brand/30 bg-brand/10 text-brand",
  member: "chip-success",
  viewer: "chip",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "؟") + (parts[1]?.[0] ?? "");
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ ws?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const workspace = resolveWorkspace(user.id, params.ws ?? null);

  if (!workspace) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-muted">أنشئ مساحة عمل أولاً من الإعدادات.</p>
      </div>
    );
  }

  const members = listMembers(workspace.id);

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">المساحة</p>
        <h1 className="mt-2 text-2xl font-black md:text-3xl">الأعضاء</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
          إدارة من يصل إلى مساحة «{workspace.name}». كل عضو يرى بيانات المساحة
          التي ينضم إليها فقط، ولا يمكنه الوصول إلى أجهزة مساحات أخرى.
        </p>
      </header>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/70 px-5 py-4">
          <div className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-brand" />
            <h2 className="text-base font-bold">قائمة الأعضاء</h2>
          </div>
          <span className="chip">{members.length} عضو</span>
        </div>
        <ul className="divide-y divide-line/60">
          {members.map((member) => (
            <li
              key={member.user_id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand/15 text-xs font-bold text-brand">
                  {initials(member.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {member.name}
                    {member.user_id === user.id ? (
                      <span className="ms-2 text-[10px] text-brand">(أنت)</span>
                    ) : null}
                  </p>
                  <p className="truncate text-[11px] text-muted" dir="ltr">
                    {member.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={ROLE_TONES[member.role] ?? "chip"}>
                  {ROLE_LABELS[member.role] ?? member.role}
                </span>
                <span className="text-[10px] text-muted">
                  انضم {formatDateTime(member.created_at)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <InvitePanel workspaceId={workspace.id} role={workspace.role ?? "viewer"} />
        <JoinWorkspacePanel />
      </div>
    </div>
  );
}
