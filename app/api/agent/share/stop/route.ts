import { audit } from "@/lib/audit";
import { deviceByToken } from "@/lib/devices";
import { bearerToken, fail, json } from "@/lib/http";
import { stopShare } from "@/lib/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = bearerToken(req);
  if (!token) return fail("رمز الجهاز مطلوب", 401);
  const device = deviceByToken(token);
  if (!device) return fail("الجهاز غير مصرح أو تم إلغاؤه", 401);

  stopShare(device.id);
  audit({
    workspaceId: device.workspace_id,
    action: "share.stop",
    deviceId: device.id,
  });
  return json({ ok: true });
}
