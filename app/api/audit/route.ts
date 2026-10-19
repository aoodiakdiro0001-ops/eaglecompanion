import { getSessionUser } from "@/lib/auth";
import { listAudit } from "@/lib/audit";
import { fail, json } from "@/lib/http";
import { getMembership } from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("يجب تسجيل الدخول", 401);

  const workspaceId = new URL(req.url).searchParams.get("workspaceId");
  if (!workspaceId) return fail("معرّف المساحة مطلوب", 400);
  if (!getMembership(user.id, workspaceId)) {
    return fail("لا تملك صلاحية الوصول", 403);
  }
  return json({ events: listAudit(workspaceId) });
}
