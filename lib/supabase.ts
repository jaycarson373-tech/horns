import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getConfig } from "./config";

export type ProcessedMentionStatus = "queued" | "processing" | "replied" | "dry_run" | "skipped" | "failed";

export type ProcessedMention = {
  id: string;
  bot_project: string;
  mention_id: string;
  author_id: string;
  author_username: string | null;
  profile_image_url: string | null;
  status: ProcessedMentionStatus;
  reply_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateProcessedMentionInput = {
  mentionId: string;
  authorId: string;
  authorUsername?: string;
  profileImageUrl?: string;
  status?: ProcessedMentionStatus;
};

export type AutoTradeStatus = "queued" | "submitted" | "executed" | "failed" | "skipped";

export type PumpTrade = {
  id: string;
  bot_project: string;
  mention_id: string;
  author_id: string;
  author_username: string | null;
  author_followers: number | null;
  token_mint: string;
  token_symbol: string | null;
  token_decimals: number | null;
  token_amount: number | null;
  sol_amount: number;
  quote_amount_lamports: string | null;
  status: AutoTradeStatus;
  tx_signature: string | null;
  reason: string | null;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreatePumpTradeInput = {
  mentionId: string;
  authorId: string;
  tokenMint: string;
  solAmount: number;
  tokenSymbol?: string | null;
  tokenAmount?: number | null;
  tokenDecimals?: number | null;
  authorUsername?: string | null;
  authorFollowers?: number | null;
  quoteAmountLamports?: string | null;
  status?: AutoTradeStatus;
  reason?: string | null;
  txSignature?: string | null;
};

export type UpdateProcessedMentionInput = Partial<{
  authorUsername: string | null;
  error: string | null;
  profileImageUrl: string | null;
  replyId: string | null;
  status: ProcessedMentionStatus;
}>;

const TABLE = "processed_mentions";
const TRADES_TABLE = "pump_trades";

let supabaseClient: SupabaseClient | undefined;

export function getSupabase() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
    }

    supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return supabaseClient;
}

export async function createProcessedMention(input: CreateProcessedMentionInput) {
  const config = getConfig();
  const row = {
    bot_project: config.botProjectKey,
    mention_id: input.mentionId,
    author_id: input.authorId,
    author_username: input.authorUsername ?? null,
    profile_image_url: input.profileImageUrl ?? null,
    status: input.status ?? "queued"
  };

  const { data, error } = await getSupabase()
    .from(TABLE)
    .insert(row)
    .select("*")
    .single<ProcessedMention>();

  if (error) {
    if (error.code === "23505") {
      const { data: existingRecord, error: readError } = await getSupabase()
        .from(TABLE)
        .select("*")
        .eq("bot_project", config.botProjectKey)
        .eq("mention_id", input.mentionId)
        .single<ProcessedMention>();

      if (readError) {
        throw readError;
      }

      return { created: false as const, record: existingRecord };
    }

    throw error;
  }

  return { created: true as const, record: data };
}

export async function createAutoTrade(input: CreatePumpTradeInput) {
  const config = getConfig();
  const row = {
    bot_project: config.botProjectKey,
    mention_id: input.mentionId,
    author_id: input.authorId,
    author_username: input.authorUsername ?? null,
    author_followers: input.authorFollowers ?? null,
    token_mint: input.tokenMint,
    token_symbol: input.tokenSymbol ?? null,
    token_decimals: input.tokenDecimals ?? null,
    token_amount: input.tokenAmount ?? null,
    sol_amount: input.solAmount,
    quote_amount_lamports: input.quoteAmountLamports ?? null,
    status: input.status ?? "queued",
    reason: input.reason ?? null,
    tx_signature: input.txSignature ?? null
  };

  const { data, error } = await getSupabase()
    .from(TRADES_TABLE)
    .insert(row)
    .select("*")
    .single<PumpTrade>();

  if (error) {
    if (error.code === "23505") {
      const { data: existingTrade, error: readError } = await getSupabase()
        .from(TRADES_TABLE)
        .select("*")
        .eq("bot_project", config.botProjectKey)
        .eq("mention_id", input.mentionId)
        .single<PumpTrade>();

      if (readError) {
        throw readError;
      }

      return { created: false as const, trade: existingTrade };
    }

    throw error;
  }

  return { created: true as const, trade: data };
}

export async function updateAutoTrade(tradeId: string, patch: {
  status?: AutoTradeStatus;
  reason?: string | null;
  tx_signature?: string | null;
  token_amount?: number | null;
  token_decimals?: number | null;
  token_symbol?: string | null;
  quote_amount_lamports?: string | null;
  executed_at?: string | null;
  author_followers?: number | null;
}) {
  const config = getConfig();
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (patch.status !== undefined) update.status = patch.status;
  if (patch.reason !== undefined) update.reason = patch.reason;
  if (patch.tx_signature !== undefined) update.tx_signature = patch.tx_signature;
  if (patch.token_amount !== undefined) update.token_amount = patch.token_amount;
  if (patch.token_decimals !== undefined) update.token_decimals = patch.token_decimals;
  if (patch.token_symbol !== undefined) update.token_symbol = patch.token_symbol;
  if (patch.quote_amount_lamports !== undefined) update.quote_amount_lamports = patch.quote_amount_lamports;
  if (patch.executed_at !== undefined) update.executed_at = patch.executed_at;
  if (patch.author_followers !== undefined) update.author_followers = patch.author_followers;

  const { data, error } = await getSupabase()
    .from(TRADES_TABLE)
    .update(update)
    .eq("id", tradeId)
    .select("*")
    .single<PumpTrade>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateProcessedMention(mentionId: string, input: UpdateProcessedMentionInput) {
  const config = getConfig();
  const patch = {
    ...(input.authorUsername !== undefined ? { author_username: input.authorUsername } : {}),
    ...(input.error !== undefined ? { error: input.error } : {}),
    ...(input.profileImageUrl !== undefined ? { profile_image_url: input.profileImageUrl } : {}),
    ...(input.replyId !== undefined ? { reply_id: input.replyId } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await getSupabase()
    .from(TABLE)
    .update(patch)
    .eq("bot_project", config.botProjectKey)
    .eq("mention_id", mentionId)
    .select("*")
    .single<ProcessedMention>();

  if (error) {
    throw error;
  }

  return data;
}

export async function countRecentReplies(sinceIso: string, authorId?: string) {
  const config = getConfig();
  let query = getSupabase()
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("bot_project", config.botProjectKey)
    .gte("updated_at", sinceIso)
    .in("status", ["replied", "dry_run"]);

  if (authorId) {
    query = query.eq("author_id", authorId);
  }

  const { count, error } = await query;
  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function countRecentAutoTradesByAuthor(sinceIso: string, authorId: string) {
  const config = getConfig();
  const { count, error } = await getSupabase()
    .from(TRADES_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("bot_project", config.botProjectKey)
    .eq("author_id", authorId)
    .in("status", ["submitted", "executed"])
    .gte("created_at", sinceIso);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function readRecentAutoTrades(limit = 30) {
  const config = getConfig();
  const { data, error } = await getSupabase()
    .from(TRADES_TABLE)
    .select(`
      *,
      token:pump_tokens(symbol, name, price_usd)
    `)
    .eq("bot_project", config.botProjectKey)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data as unknown as Array<PumpTrade & { token?: { symbol: string | null; name: string | null; price_usd: number | null } | null }>;
}
