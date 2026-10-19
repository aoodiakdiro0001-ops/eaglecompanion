import { getSessionUser } from "@/lib/auth";
import { getDeviceForUser } from "@/lib/devices";
import { getFrame } from "@/lib/frames";
import { fail } from "@/lib/http";
import { activeShare, isShareLive } from "@/lib/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Context) {
  const user = await getSessionUser();
  if (!user) return fail("يجب تسجيل الدخول", 401);
  const { id } = await context.params;

  const found = await getDeviceForUser(user.id, id);
  if (!found) return fail("الجهاز غير موجود", 404);

  const frame = getFrame(found.device.id);
  const share = await activeShare(found.device.id);
  if (
    !frame ||
    !share ||
    frame.shareId !== share.id ||
    !isShareLive(share)
  ) {
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return new Response(new Uint8Array(frame.bytes), {
    status: 200,
    headers: {
      "Content-Type": frame.mime,
      "Cache-Control": "no-store, max-age=0",
      "X-Frame-Updated": String(frame.updatedAt),
    },
  });
}
