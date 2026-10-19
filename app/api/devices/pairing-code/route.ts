import { getSessionUser } from "@/lib/auth";
import { canManageDevices, createPairingCode } from "@/lib/devices";
import { checkOrigin, fail, json, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { pairingCodeSchema } from "@/lib/validation";
import { getMembership } from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!checkOrigin(req)) return fail("طلب غير مسموح", 403);
  const user = await getSessionUser();
  if (!user) return fail("يجب تسجيل الدخول", 401);

  const limit = rateLimit(`pair-code:${user.id}`, 20, 10 * 60 * 1000);
  if (!limit.allowed) return fail("محاولات كثيرة، حاول لاحقاً", 429);

  const parsed = await parseBody(req, pairingCodeSchema);
  if (!parsed.ok) return parsed.response;

  const membership = await getMembership(user.id, parsed.data.workspaceId);
  if (!membership) return fail("لا تملك صلاحية الوصول", 403);
  if (!canManageDevices(membership.role)) {
    return fail("إضافة الأجهزة غير متاحة لدورك", 403);
  }

  const result = await createPairingCode(parsed.data.workspaceId, user.id);
  return json(result, 201);
}
