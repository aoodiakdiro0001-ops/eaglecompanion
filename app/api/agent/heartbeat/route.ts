import { deviceByToken, touchDevice } from "@/lib/devices";
import { bearerToken, fail, json, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { heartbeatSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = bearerToken(req);
  if (!token) return fail("رمز الجهاز مطلوب", 401);

  const device = deviceByToken(token);
  if (!device) return fail("الجهاز غير مصرح أو تم إلغاؤه", 401);

  const limit = rateLimit(`heartbeat:${device.id}`, 120, 60 * 1000);
  if (!limit.allowed) return fail("طلبات كثيرة جداً", 429);

  const parsed = await parseBody(req, heartbeatSchema);
  if (!parsed.ok) return parsed.response;

  const updated = touchDevice(device.id, {
    batteryLevel: parsed.data.batteryLevel,
    charging: parsed.data.charging,
    networkType: parsed.data.networkType,
    platform: parsed.data.platform,
    model: parsed.data.model,
    screenW: parsed.data.screenW,
    screenH: parsed.data.screenH,
  });

  return json({ ok: true, device: updated, serverTime: Date.now() });
}
