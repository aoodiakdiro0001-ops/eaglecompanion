import { getSessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { checkOrigin, fail, json, parseBody } from "@/lib/http";
import { getWorkspaceForUser, InviteError, joinWorkspace } from "@/lib/workspaces";
import { joinSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!checkOrigin(req)) return fail("طلب غير مسموح", 403);
  const user = await getSessionUser();
  if (!user) return fail("يجب تسجيل الدخول", 401);

  const parsed = await parseBody(req, joinSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await joinWorkspace(user.id, parsed.data.code);
    await audit({
      workspaceId: result.workspaceId,
      action: "member.join",
      actorUserId: user.id,
      metadata: { role: result.role },
    });
    const workspace = await getWorkspaceForUser(user.id, result.workspaceId);
    return json({ workspace, role: result.role });
  } catch (error) {
    if (error instanceof InviteError) {
      return fail("كود الدعوة غير صالح أو منتهي", 400);
    }
    return fail("تعذر الانضمام إلى المساحة", 500);
  }
}
