import { getConfig } from "./config";
import { getSupabase } from "./supabase";
import { createStandalonePost } from "./x";

type PublicationCandidate = {
  eventKey: string;
  eventType: "signal" | "trade" | "trade_profit" | "buyback" | "burn";
  sourceId: string;
  createdAt: string;
  text: string;
};

function tokenLabel(symbol: unknown, mint?: unknown) {
  if (typeof symbol === "string" && symbol.trim()) return `$${symbol.trim().toUpperCase()}`;
  if (typeof mint === "string" && mint.length >= 8) return `${mint.slice(0, 4)}...${mint.slice(-4)}`;
  return "TOKEN";
}

function cleanLine(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function numberText(value: unknown, maximumFractionDigits = 4) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return amount.toLocaleString("en-US", { maximumFractionDigits });
}

function fitPost(lines: string[]) {
  const text = lines.filter(Boolean).join("\n");
  return text.length <= 280 ? text : `${text.slice(0, 277)}...`;
}

export function buildSignalPost(row: Record<string, unknown>) {
  const token = row.token && typeof row.token === "object" ? row.token as Record<string, unknown> : {};
  const confidence = Number(row.confidence);
  return fitPost([
    "XBT CALL",
    `${tokenLabel(token.symbol, row.token_mint)} · ${Number.isFinite(confidence) ? `${confidence}/100` : "VERIFIED SIGNAL"}`,
    cleanLine(row.thesis, 120),
    "Tracking follow-through. Not financial advice."
  ]);
}

export function buildTradePost(row: Record<string, unknown>) {
  const amount = numberText(row.sol_amount, 3);
  const signature = typeof row.tx_signature === "string" ? row.tx_signature : "";
  return fitPost([
    "XBT TRADE",
    tokenLabel(row.token_symbol, row.token_mint),
    amount ? `Position opened: ${amount} SOL.` : "Position opened onchain.",
    signature ? `Verified execution: https://solscan.io/tx/${signature}` : "",
    "Public record. Not financial advice."
  ]);
}

export function buildTreasuryPost(row: Record<string, unknown>) {
  const eventType = String(row.event_type);
  const labels: Record<string, string> = {
    trade_profit: "XBT REALIZED PROFIT",
    buyback: "$PUMPXBT BUYBACK",
    burn: "$PUMPXBT BURN"
  };
  const amount = numberText(row.amount);
  const token = typeof row.token === "string" ? row.token : "";
  const usd = numberText(row.amount_usd, 2);
  const signature = typeof row.signature === "string" ? row.signature : "";
  return fitPost([
    labels[eventType] ?? "PUMPXBT TREASURY UPDATE",
    amount ? `${amount} ${token}${usd ? ` · $${usd}` : ""}` : "Verified onchain event.",
    signature ? `Proof: https://solscan.io/tx/${signature}` : "",
    eventType === "trade_profit" ? "Realized strategy profit feeds the flywheel." : "Recorded in the public treasury ledger."
  ]);
}

async function readCandidates(cutoff: string): Promise<PublicationCandidate[]> {
  const db = getSupabase();
  const [signals, trades, treasury] = await Promise.all([
    db.from("pump_signals")
      .select("id,token_mint,thesis,confidence,published_at,token:pump_tokens(symbol)")
      .eq("status", "active")
      .not("approved_by", "is", null)
      .not("published_at", "is", null)
      .gte("published_at", cutoff)
      .order("published_at", { ascending: false })
      .limit(20),
    db.from("pump_trades")
      .select("id,token_mint,token_symbol,sol_amount,tx_signature,executed_at")
      .eq("status", "executed")
      .not("tx_signature", "is", null)
      .gte("executed_at", cutoff)
      .order("executed_at", { ascending: false })
      .limit(20),
    db.from("treasury_events")
      .select("signature,event_type,token,amount,amount_usd,block_time")
      .in("event_type", ["trade_profit", "buyback", "burn"])
      .gte("block_time", cutoff)
      .order("block_time", { ascending: false })
      .limit(20)
  ]);

  for (const result of [signals, trades, treasury]) {
    if (result.error) throw result.error;
  }

  const candidates: PublicationCandidate[] = [];
  for (const row of signals.data ?? []) {
    const record = row as unknown as Record<string, unknown>;
    const id = String(record.id);
    candidates.push({ eventKey: `signal:${id}`, eventType: "signal", sourceId: id, createdAt: String(record.published_at), text: buildSignalPost(record) });
  }
  for (const row of trades.data ?? []) {
    const record = row as Record<string, unknown>;
    const id = String(record.id);
    candidates.push({ eventKey: `trade:${id}`, eventType: "trade", sourceId: id, createdAt: String(record.executed_at), text: buildTradePost(record) });
  }
  for (const row of treasury.data ?? []) {
    const record = row as Record<string, unknown>;
    const signature = String(record.signature);
    const eventType = String(record.event_type) as PublicationCandidate["eventType"];
    candidates.push({ eventKey: `treasury:${signature}`, eventType, sourceId: signature, createdAt: String(record.block_time), text: buildTreasuryPost(record) });
  }

  return candidates.sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
}

async function reserve(candidate: PublicationCandidate) {
  const config = getConfig();
  const db = getSupabase();
  const row = {
    bot_project: config.botProjectKey,
    event_key: candidate.eventKey,
    event_type: candidate.eventType,
    source_id: candidate.sourceId,
    post_text: candidate.text,
    status: "queued"
  };
  const { error } = await db.from("x_publications").insert(row);
  if (!error) return true;
  if (error.code !== "23505") throw error;

  const { data: existing, error: readError } = await db.from("x_publications")
    .select("status")
    .eq("bot_project", config.botProjectKey)
    .eq("event_key", candidate.eventKey)
    .single();
  if (readError) throw readError;
  if (existing.status !== "failed") return false;

  const { error: retryError } = await db.from("x_publications")
    .update({ status: "queued", error: null, updated_at: new Date().toISOString() })
    .eq("bot_project", config.botProjectKey)
    .eq("event_key", candidate.eventKey);
  if (retryError) throw retryError;
  return true;
}

export async function runVerifiedAutoPostOnce() {
  const config = getConfig();
  if (!config.xAutoPostEnabled || config.dryRun) return { status: "disabled" as const };

  const db = getSupabase();
  const { data: latest, error: latestError } = await db.from("x_publications")
    .select("published_at")
    .eq("bot_project", config.botProjectKey)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) throw latestError;

  const lastPublished = latest?.published_at ? Date.parse(latest.published_at) : Number.NaN;
  if (Number.isFinite(lastPublished) && Date.now() - lastPublished < config.xAutoPostMinIntervalMinutes * 60_000) {
    return { status: "rate_limited" as const };
  }

  const cutoff = new Date(Date.now() - config.xAutoPostMaxEventAgeMinutes * 60_000).toISOString();
  const candidates = await readCandidates(cutoff);
  for (const candidate of candidates) {
    if (!await reserve(candidate)) continue;
    try {
      const postId = await createStandalonePost(candidate.text);
      const { error } = await db.from("x_publications")
        .update({ status: "published", tweet_id: postId, error: null, published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("bot_project", config.botProjectKey)
        .eq("event_key", candidate.eventKey);
      if (error) throw error;
      console.info("x.autopost.published", { eventKey: candidate.eventKey, eventType: candidate.eventType, postId });
      return { status: "published" as const, postId, eventKey: candidate.eventKey };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db.from("x_publications")
        .update({ status: "failed", error: message, updated_at: new Date().toISOString() })
        .eq("bot_project", config.botProjectKey)
        .eq("event_key", candidate.eventKey);
      throw error;
    }
  }

  return { status: "idle" as const };
}
