// Cloudflare Turnstile verification: one check when a session starts, so scripts can't drive
// the kit's model with fresh sessions. https://developers.cloudflare.com/turnstile/

export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(
  token: string,
  ip: string | null,
  secretKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; errors: string[] }> {
  if (!token) return { ok: false, errors: ["missing-input-response"] };
  const form = new URLSearchParams({ secret: secretKey, response: token });
  if (ip) form.set("remoteip", ip);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetchImpl(SITEVERIFY_URL, { method: "POST", body: form, signal: controller.signal });
    if (!res.ok) return { ok: false, errors: [`http-${res.status}`] };
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    return { ok: data.success === true, errors: data["error-codes"] ?? [] };
  } catch (err) {
    return { ok: false, errors: [`unreachable: ${(err as Error).message}`] };
  } finally {
    clearTimeout(timer);
  }
}
