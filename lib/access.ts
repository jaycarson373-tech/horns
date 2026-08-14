import {
  createHmac,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  verify as verifySignature
} from "node:crypto";

import { pumpConfig, requirePumpServerConfig } from "./pumpConfig";

export const ACCESS_COOKIE = "pumpxbt_access";
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export type AccessSession = {
  wallet: string;
  exp: number;
  balanceRaw: string;
  decimals: number;
};

export function accessIsConfigured() {
  return Boolean(
    pumpConfig.heliusApiKey
    && pumpConfig.tokenMint
    && pumpConfig.publicTokenMint
    && pumpConfig.tokenMint === pumpConfig.publicTokenMint
    && pumpConfig.sessionSecret
    && pumpConfig.sessionSecret.length >= 32
    && process.env.SUPABASE_URL?.trim()
    && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export function formatTokenBalance(raw: string, decimals: number) {
  const value = raw.padStart(decimals + 1, "0");
  const whole = decimals === 0 ? value : value.slice(0, -decimals);
  const fraction = decimals === 0 ? "" : value.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

export function decodeBase58(value: string) {
  if (!value) throw new Error("Empty base58 value");
  const bytes = [0];
  for (const character of value) {
    const digit = BASE58_ALPHABET.indexOf(character);
    if (digit < 0) throw new Error("Invalid base58 value");
    let carry = digit;
    for (let index = 0; index < bytes.length; index += 1) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let index = 0; index < value.length - 1 && value[index] === "1"; index += 1) bytes.push(0);
  return Uint8Array.from(bytes.reverse());
}

export function validateSolanaAddress(value: string) {
  try {
    return decodeBase58(value).length === 32;
  } catch {
    return false;
  }
}

export function createChallengeMessage(wallet: string, domain: string) {
  const nonce = randomBytes(24).toString("base64url");
  const issuedAt = new Date().toISOString();
  const message = [
    "PumpXBT access verification",
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    `Issued: ${issuedAt}`,
    `Domain: ${domain}`,
    "",
    "Signing is read-only and does not authorize a transaction."
  ].join("\n");
  return { nonce, message };
}

export function verifyWalletSignature(wallet: string, message: string, signatureBase64: string) {
  try {
    const publicKeyBytes = decodeBase58(wallet);
    if (publicKeyBytes.length !== 32) return false;
    const publicKey = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyBytes)]),
      format: "der",
      type: "spki"
    });
    const signature = Buffer.from(signatureBase64, "base64");
    return signature.length === 64 && verifySignature(null, Buffer.from(message, "utf8"), publicKey, signature);
  } catch {
    return false;
  }
}

type TokenAccountResponse = {
  result?: {
    value?: Array<{
      account?: {
        data?: {
          parsed?: {
            info?: {
              tokenAmount?: { amount?: string; decimals?: number };
            };
          };
        };
      };
    }>;
  };
  error?: { message?: string };
};

export async function readAccessTokenBalance(wallet: string) {
  const { heliusApiKey, tokenMint } = requirePumpServerConfig();
  const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(heliusApiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "pumpxbt-access",
      method: "getTokenAccountsByOwner",
      params: [wallet, { mint: tokenMint }, { encoding: "jsonParsed" }]
    }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Helius balance check failed (${response.status})`);
  const payload = await response.json() as TokenAccountResponse;
  if (payload.error) throw new Error(payload.error.message ?? "Helius balance check failed");

  let amountRaw = 0n;
  let decimals = 0;
  for (const account of payload.result?.value ?? []) {
    const tokenAmount = account.account?.data?.parsed?.info?.tokenAmount;
    if (!tokenAmount?.amount) continue;
    amountRaw += BigInt(tokenAmount.amount);
    decimals = tokenAmount.decimals ?? decimals;
  }
  const requiredRaw = BigInt(pumpConfig.accessThresholdTokens) * (10n ** BigInt(decimals));
  return { amountRaw, decimals, requiredRaw, eligible: amountRaw >= requiredRaw };
}

function sign(value: string) {
  if (!pumpConfig.sessionSecret || pumpConfig.sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  }
  return createHmac("sha256", pumpConfig.sessionSecret).update(value).digest("base64url");
}

export function createAccessToken(wallet: string, balanceRaw: bigint, decimals: number) {
  const session: AccessSession = {
    wallet,
    balanceRaw: balanceRaw.toString(),
    decimals,
    exp: Date.now() + pumpConfig.sessionMinutes * 60_000
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function parseAccessToken(token: string | undefined) {
  if (!token || !pumpConfig.sessionSecret || pumpConfig.sessionSecret.length < 32) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AccessSession;
    if (!session.wallet || !Number.isFinite(session.exp) || session.exp <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}
