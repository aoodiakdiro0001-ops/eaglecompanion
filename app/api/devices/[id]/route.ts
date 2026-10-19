import { getSessionUser } from "@/lib/auth";
import {
  canManageDevices,
  getDeviceForUser,
  revokeDevice,
} from "@/lib/devices";
import { checkOrigin, clientIp, fail, json } from "@/lib/http";
import { activeShare, isShareLive } from "@/lib/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Context) {
  const user = await getSessionUser();
  if (!user) return fail("يجب تسجيل الدخول", 401);
  const { id } = await context.params;

  const found = getDeviceForUser(user.id, id);
  if (!found) return fail("الجهاز غير موجود", 404);

  const share = activeShare(found.device.id);
  return json({
    device: found.device,
    role: found.role,
    share: share
      ? {
          id: share.id,
          startedAt: share.started_at,
          expiresAt: share.expires_at,
          lastFrameAt: share.last_frame_at,
          framesCount: share.frames_count,
          live: isShareLive(share),
        }
      : null,
  });
}

export async function DELETE(req: Request, context: Context) {
  if (!checkOrigin(req)) return fail("طلب غير مسموح", 403);
  const user = await getSessionUser();
  if (!user) return fail("يجب تسجيل الدخول", 401);
  const { id } = await context.params;

  const found = getDeviceForUser(user.id, id);
  if (!found) return fail("الجهاز غير موجود", 404);
  if (!canManageDevices(found.role)) {
    return fail("إلغاء الجهاز غير متاح لدورك", 403);
  }

  const revoked = revokeDevice(
    found.device.workspace_id,
    found.device.id,
    user.id,
    found.role,
    clientIp(req),
  );
  if (!revoked) return fail("تعذر إلغاء الجهاز", 400);
  return json({ ok: true });
}
