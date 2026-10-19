import { authenticate, createSession } from "@/lib/auth";
import { checkOrigin, clientIp, fail, json, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!checkOrigin(req)) return fail("طلب غير مسموح", 403);

  const parsed = await parseBody(req, loginSchema);
  if (!parsed.ok) return parsed.response;

  const ip = clientIp(req);
  const ipLimit = rateLimit(`login-ip:${ip}`, 30, 5 * 60 * 1000);
  if (!ipLimit.allowed) return fail("محاولات دخول كثيرة، حاول لاحقاً", 429);

  const limit = rateLimit(
    `login:${ip}:${parsed.data.email}`,
    8,
    5 * 60 * 1000,
  );
  if (!limit.allowed) return fail("محاولات دخول كثيرة، حاول لاحقاً", 429);

  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) return fail("البريد الإلكتروني أو كلمة المرور غير صحيحة", 401);

  await createSession(user.id);
  return json({ user });
}
