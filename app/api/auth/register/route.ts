import {
  createSession,
  DuplicateEmailError,
  registerUser,
} from "@/lib/auth";
import { checkOrigin, clientIp, fail, json, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!checkOrigin(req)) return fail("طلب غير مسموح", 403);

  const limit = rateLimit(`register:${clientIp(req)}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) return fail("محاولات كثيرة، حاول لاحقاً", 429);

  const parsed = await parseBody(req, registerSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const { user } = await registerUser(parsed.data);
    await createSession(user.id);
    return json({ user }, 201);
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return fail("هذا البريد مسجل مسبقاً", 409);
    }
    return fail("تعذر إنشاء الحساب", 500);
  }
}
