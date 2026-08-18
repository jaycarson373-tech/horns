const read = (name: string) => process.env[name]?.trim() || undefined;

function integer(name: string, fallback: number, minimum = 0) {
  const raw = read(name);
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < minimum) {
    throw new Error(`${name} must be an integer >= ${minimum}`);
  }
  return value;
}

function number(name: string, fallback: number, minimum = 0) {
  const raw = read(name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < minimum) {
    throw new Error(`${name} must be a number >= ${minimum}`);
  }
  return value;
}

export const pumpConfig = {
  botHandle: read("NEXT_PUBLIC_BOT_HANDLE")?.replace(/^@+/, "") ?? "PumpXBT_",
  publicTokenMint: read("NEXT_PUBLIC_PUMPXBT_TOKEN_MINT") ?? "63rgqN7DhrwEC9xoDLeH8owePssdK6dZYcD5dfJbpump",
  tokenMint: read("PUMPXBT_TOKEN_MINT") ?? "",
  accessThresholdTokens: integer("PUMPXBT_ACCESS_THRESHOLD", 500_000, 1),
  sessionMinutes: integer("PUMPXBT_SESSION_MINUTES", 30, 5),
  heliusApiKey: read("HELIUS_API_KEY"),
  cronSecret: read("CRON_SECRET"),
  sessionSecret: read("SESSION_SECRET"),
  highConvictionMinScore: number("HIGH_CONVICTION_MIN_SCORE", 85, 0),
  minimumLiquidityUsd: number("MIN_SIGNAL_LIQUIDITY_USD", 50_000, 0),
  minimumVolume24hUsd: number("MIN_SIGNAL_VOLUME_24H_USD", 100_000, 0),
  tokenSuffix: (read("PUMP_TOKEN_SUFFIX") ?? "pump").toLowerCase(),
  dexScreenerBaseUrl: read("DEXSCREENER_BASE_URL") ?? "https://api.dexscreener.com"
};

export function requirePumpServerConfig() {
  if (!pumpConfig.heliusApiKey) throw new Error("HELIUS_API_KEY is required");
  if (!pumpConfig.tokenMint) throw new Error("PUMPXBT_TOKEN_MINT is required");
  if (pumpConfig.publicTokenMint && pumpConfig.publicTokenMint !== pumpConfig.tokenMint) {
    throw new Error("PUMPXBT_TOKEN_MINT must match NEXT_PUBLIC_PUMPXBT_TOKEN_MINT");
  }
  if (!pumpConfig.sessionSecret || pumpConfig.sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  }
  return {
    heliusApiKey: pumpConfig.heliusApiKey,
    tokenMint: pumpConfig.tokenMint,
    sessionSecret: pumpConfig.sessionSecret
  };
}

export function cronAuthorized(request: Request) {
  if (!pumpConfig.cronSecret) return false;
  return request.headers.get("authorization") === `Bearer ${pumpConfig.cronSecret}`;
}
