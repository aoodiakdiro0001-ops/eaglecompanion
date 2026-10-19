import { getSessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { checkOrigin, fail, json, parseBody } from "@/lib/http";
import { createWorkspace, listWorkspaces } from "@/lib/workspaces";
import { workspaceSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("يجب تسجيل الدخول", 401);
  return json({ workspaces: listWorkspaces(user.id) });
}

export async function POST(req: Request) {
  if (!checkOrigin(req)) return fail("طلب غير مسموح", 403);
  const user = await getSessionUser();
  if (!user) return fail("يجب تسجيل الدخول", 401);

  const parsed = await parseBody(req, workspaceSchema);
  if (!parsed.ok) return parsed.response;

  const workspace = createWorkspace(user.id, parsed.data.name);
  audit({
    workspaceId: workspace.id,
    action: "workspace.create",
    actorUserId: user.id,
    metadata: { name: workspace.name },
  });
  return json({ workspace }, 201);
}
