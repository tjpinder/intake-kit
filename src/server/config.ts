// Server configuration from app settings (environment variables). Every cap has a default; the
// kit's Azure key and the IP hash salt have none, and without them the kit's own provider is
// switched off rather than run unprotected.

export interface ServerConfig {
  azure: { endpoint: string; apiKey: string; deployment: string; model: string } | null;
  monthlyBudgetUSD: number;
  dailyBudgetUSD: number;
  sessionBudgetUSD: number;
  sessionMaxTurns: number;
  ipTurnsPerHour: number;
  ipTurnsPerDay: number;
  maxMessageChars: number;
  maxBodyBytes: number;
  turnstile: { secretKey: string; siteKey: string } | null;
  ipHashSalt: string | null;
  allowByok: boolean;
  /** Problems that switch something off; reported by /api/config and logged at start. */
  warnings: string[];
}

function num(env: Record<string, string | undefined>, key: string, fallback: number, warnings: string[]): number {
  const raw = env[key];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    warnings.push(`${key}="${raw}" isn't a non-negative number; using ${fallback}.`);
    return fallback;
  }
  return n;
}

export function readServerConfig(env: Record<string, string | undefined>): ServerConfig {
  const warnings: string[] = [];
  const endpoint = env.AZURE_OPENAI_ENDPOINT ?? "";
  const apiKey = env.AZURE_OPENAI_API_KEY ?? "";
  const ipHashSalt = env.IP_HASH_SALT && env.IP_HASH_SALT.length >= 16 ? env.IP_HASH_SALT : null;
  if (!ipHashSalt) warnings.push("IP_HASH_SALT is missing or shorter than 16 characters, so per-visitor rate limits can't run and every request is refused.");

  let azure: ServerConfig["azure"] = null;
  if (endpoint && apiKey) {
    azure = { endpoint, apiKey, deployment: env.AZURE_OPENAI_DEPLOYMENT || "intake-kit-eval-gpt41", model: env.AZURE_OPENAI_MODEL || "gpt-4.1" };
  } else {
    warnings.push("AZURE_OPENAI_ENDPOINT or AZURE_OPENAI_API_KEY is missing, so the kit's own model is off; visitors need their own key.");
  }

  const secretKey = env.TURNSTILE_SECRET_KEY ?? "";
  const siteKey = env.TURNSTILE_SITE_KEY ?? "";
  const turnstile = secretKey && siteKey ? { secretKey, siteKey } : null;
  if (!turnstile) warnings.push("TURNSTILE_SECRET_KEY or TURNSTILE_SITE_KEY is missing, so bot protection is off.");

  return {
    azure,
    monthlyBudgetUSD: num(env, "MONTHLY_BUDGET_USD", 100, warnings),
    dailyBudgetUSD: num(env, "DAILY_BUDGET_USD", 10, warnings),
    sessionBudgetUSD: num(env, "SESSION_BUDGET_USD", 1.5, warnings),
    sessionMaxTurns: num(env, "SESSION_MAX_TURNS", 60, warnings),
    ipTurnsPerHour: num(env, "IP_TURNS_PER_HOUR", 60, warnings),
    ipTurnsPerDay: num(env, "IP_TURNS_PER_DAY", 300, warnings),
    maxMessageChars: num(env, "MAX_MESSAGE_CHARS", 4000, warnings),
    maxBodyBytes: num(env, "MAX_BODY_BYTES", 1_000_000, warnings),
    turnstile,
    ipHashSalt,
    allowByok: env.ALLOW_BYOK !== "false",
    warnings,
  };
}
