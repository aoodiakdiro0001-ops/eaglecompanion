import { audit } from "@/lib/audit";
import { deviceByToken } from "@/lib/devices";
import { bearerToken, fail, json } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { startShare } from "@/lib/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = bearerToken(req);
  if (!token) return fail("رمز الجهاز مطلوب", 401);
  const device = deviceByToken(token);
  if (!device) return fail("الجهاز غير مصرح أو تم إلغاؤه", 401);

  const limit = rateLimit(`share-start:${device.id}`, 12, 60 * 1000);
  if (!limit.allowed) return fail("محاولات كثيرة، حاول بعد قليل", 429);

  const share = startShare(device.id);
  audit({
    workspaceId: device.workspace_id,
    action: "share.start",
    deviceId: device.id,
    metadata: { expiresAt: share.expires_at },
  });

  return json(
    { shareId: share.id, startedAt: share.started_at, expiresAt: share.expires_at },
    201,
  );
}
