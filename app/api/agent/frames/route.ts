import { deviceByToken } from "@/lib/devices";
import { setFrame } from "@/lib/frames";
import { bearerToken, fail, json, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getShare, recordFrame } from "@/lib/share";
import { frameSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FRAME_BYTES = 400_000;

export async function POST(req: Request) {
  const token = bearerToken(req);
  if (!token) return fail("رمز الجهاز مطلوب", 401);
  const device = deviceByToken(token);
  if (!device) return fail("الجهاز غير مصرح أو تم إلغاؤه", 401);

  const limit = rateLimit(`frames:${device.id}`, 180, 60 * 1000);
  if (!limit.allowed) return fail("معدل الإطارات مرتفع جداً", 429);

  const parsed = await parseBody(req, frameSchema);
  if (!parsed.ok) return parsed.response;

  const base64 = parsed.data.image.replace(
    /^data:image\/(?:jpeg|jpg|png);base64,/i,
    "",
  );
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(base64)) {
    return fail("صيغة الصورة غير صالحة", 400);
  }
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0) return fail("الصورة فارغة", 400);
  if (bytes.length > MAX_FRAME_BYTES) return fail("الإطار كبير جداً", 413);

  const share = getShare(parsed.data.shareId);
  const timestamp = Date.now();
  if (!share || share.device_id !== device.id) {
    return fail("جلسة مشاركة غير صالحة", 404);
  }
  if (share.ended_at !== null || share.expires_at <= timestamp) {
    return fail("انتهت جلسة المشاركة", 409);
  }

  setFrame(device.id, share.id, bytes, "image/jpeg", timestamp);
  recordFrame(share.id, timestamp);

  return json({ ok: true, expiresAt: share.expires_at });
}
