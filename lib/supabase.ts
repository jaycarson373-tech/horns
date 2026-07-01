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

export type UpdateProcessedMentionInput = Partial<{
  authorUsername: string | null;
  error: string | null;
  profileImageUrl: string | null;
  replyId: string | null;
  status: ProcessedMentionStatus;
}>;

const TABLE = "processed_mentions";

let supabaseClient: SupabaseClient | undefined;

export function getSupabase() {
  if (!supabaseClient) {
    const config = getConfig();
    supabaseClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
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
    .gte("created_at", sinceIso)
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
