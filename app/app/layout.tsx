import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/require-user";
import { listWorkspaces } from "@/lib/workspaces";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const workspaces = listWorkspaces(user.id);

  return (
    <AppShell
      user={{ name: user.name, email: user.email }}
      workspaces={workspaces}
    >
      {children}
    </AppShell>
  );
}
