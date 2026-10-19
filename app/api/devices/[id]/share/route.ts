import { getSessionUser } from "@/lib/auth";
import { getDeviceForUser } from "@/lib/devices";
import { fail, json } from "@/lib/http";
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
  if (!share) return json({ sharing: false, share: null });

  return json({
    sharing: isShareLive(share),
    share: {
      id: share.id,
      startedAt: share.started_at,
      expiresAt: share.expires_at,
      lastFrameAt: share.last_frame_at,
      framesCount: share.frames_count,
    },
  });
}
