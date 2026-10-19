import { getSessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { checkOrigin, fail, json, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import {
  createInvite,
  getMembership,
  listActiveInvites,
} from "@/lib/workspaces";
import { inviteCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Context) {
  const user = await getSessionUser();
  if (!user) return fail("يجب تسجيل الدخول", 401);
  const { id } = await context.params;
  const membership = getMembership(user.id, id);
  if (!membership || membership.role !== "owner") {
    return fail("لا تملك صلاحية عرض الدعوات", 403);
  }
  return json({ invites: listActiveInvites(id) });
}

export async function POST(req: Request, context: Context) {
  if (!checkOrigin(req)) return fail("طلب غير مسموح", 403);
  const user = await getSessionUser();
  if (!user) return fail("يجب تسجيل الدخول", 401);
  const { id } = await context.params;

  const membership = getMembership(user.id, id);
  if (!membership || membership.role !== "owner") {
    return fail("إنشاء الدعوات متاح للمالك فقط", 403);
  }

  const limit = rateLimit(`invite:${user.id}`, 20, 10 * 60 * 1000);
  if (!limit.allowed) return fail("محاولات كثيرة، حاول لاحقاً", 429);

  const parsed = await parseBody(req, inviteCreateSchema);
  if (!parsed.ok) return parsed.response;

  const invite = createInvite(id, user.id, parsed.data.role);
  audit({
    workspaceId: id,
    action: "invite.create",
    actorUserId: user.id,
    metadata: { role: parsed.data.role },
  });
  return json({ invite }, 201);
}
