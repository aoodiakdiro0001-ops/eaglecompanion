import { destroySession } from "@/lib/auth";
import { checkOrigin, fail, json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!checkOrigin(req)) return fail("طلب غير مسموح", 403);
  await destroySession();
  return json({ ok: true });
}
