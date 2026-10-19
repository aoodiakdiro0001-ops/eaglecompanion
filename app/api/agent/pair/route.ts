import { consumePairingCode, PairingError } from "@/lib/devices";
import { clientIp, fail, json, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { agentPairSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = rateLimit(`agent-pair:${ip}`, 10, 60 * 1000);
  if (!limit.allowed) {
    return fail("محاولات اقتران كثيرة، حاول بعد دقيقة", 429);
  }

  const parsed = await parseBody(req, agentPairSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const { device, token } = await consumePairingCode(parsed.data, ip);
    return json({ token, device }, 201);
  } catch (error) {
    if (error instanceof PairingError) {
      return fail("كود الاقتران غير صالح أو منتهي", 400);
    }
    return fail("تعذر إتمام الاقتران", 500);
  }
}
