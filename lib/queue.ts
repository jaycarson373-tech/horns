import { generateReplyText } from "./llm";
import { getConfig } from "./config";
import {
  countRecentReplies,
  countRecentAutoTradesByAuthor,
  createProcessedMention,
  updateProcessedMention
} from "./supabase";
import {
  fetchRecentMentions,
  fetchTweetTextById,
  fetchUserById,
  isDirectMention,
  replyToMentionWithText,
  type XAuthor,
  type XMention
} from "./x";
import { executeAutoTradeFromMention } from "./pumpTrade";

function toFollowersCount(author?: XAuthor | null) {
  const followers = author?.public_metrics?.followers_count;
  return typeof followers === "number" && Number.isFinite(followers) ? followers : null;
}

export type MentionProcessOutcome = {
  mentionId: string;
  status: "duplicate" | "replied" | "dry_run" | "skipped" | "failed";
  reason?: string;
  replyId?: string;
};

export type PollRunResult = {
  source: string;
  dryRun: boolean;
  fetched: number;
  processed: number;
  replied: number;
  dryRunCount: number;
  skipped: number;
  failed: number;
  outcomes: MentionProcessOutcome[];
  startedAt: string;
  finishedAt: string;
};

function logEvent(event: string, payload: Record<string, unknown>) {
  console.info(JSON.stringify({ event, ...payload }));
}

function eventName(name: string) {
  return `${getConfig().botProjectKey}.${name}`;
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isOlderThanLimit(createdAt: string | undefined, maxAgeMinutes: number) {
  if (!createdAt || maxAgeMinutes === 0) return false;
  const created = Date.parse(createdAt);
  return Number.isFinite(created) && Date.now() - created > maxAgeMinutes * 60_000;
}

export function isRetryableProcessedMention(
  status: string,
  error: string | null | undefined,
  dryRun: boolean,
  updatedAt?: string | null
) {
  const updatedTime = updatedAt ? Date.parse(updatedAt) : Number.NaN;
  const staleProcessing = status === "processing"
    && Number.isFinite(updatedTime)
    && Date.now() - updatedTime >= 5 * 60_000;

  return status === "failed"
    || status === "queued"
    || staleProcessing
    || (!dryRun && status === "dry_run")
    || (status === "skipped" && error?.endsWith("_rate_limited"));
}

async function markSkipped(
  mention: XMention,
  reason: string,
  author?: XAuthor
): Promise<MentionProcessOutcome> {
  await updateProcessedMention(mention.id, {
    status: "skipped",
    error: reason,
    authorUsername: author?.username ?? null
  });
  logEvent(eventName("mention.skipped"), {
    mentionId: mention.id,
    authorId: mention.author_id,
    reason
  });
  return { mentionId: mention.id, status: "skipped", reason };
}

async function processMention(mention: XMention): Promise<MentionProcessOutcome> {
  const config = getConfig();
  const created = await createProcessedMention({
    mentionId: mention.id,
    authorId: mention.author_id,
    authorUsername: mention.author?.username,
    status: "queued"
  });

  if (!created.created && !isRetryableProcessedMention(
    created.record?.status ?? "",
    created.record?.error,
    config.dryRun,
    created.record?.updated_at
  )) {
    return { mentionId: mention.id, status: "duplicate", reason: "already_processed" };
  }

  await updateProcessedMention(mention.id, { status: "processing", error: null });

  try {
    if (!isDirectMention(mention.text, config.botUsername)) {
      return markSkipped(mention, "not_a_direct_mention", mention.author);
    }
    if (mention.author_id === config.botUserId) {
      return markSkipped(mention, "self_mention", mention.author);
    }
    if (isOlderThanLimit(mention.created_at, config.maxMentionAgeMinutes)) {
      return markSkipped(mention, "mention_too_old", mention.author);
    }

    const author = mention.author ?? await fetchUserById(mention.author_id);
    if (!author) return markSkipped(mention, "author_unavailable", mention.author);
    if (author.protected) return markSkipped(mention, "protected_profile", author);
    const authorFollowers = toFollowersCount(author);
    const followerThresholdEnabled = config.autoTradeEnabled && authorFollowers !== null && authorFollowers >= config.autoTradeFollowerThreshold;
    const followerThresholdBlocked = config.autoTradeEnabled && (authorFollowers === null || authorFollowers < config.autoTradeFollowerThreshold);

    await updateProcessedMention(mention.id, { authorUsername: author.username ?? null });

    const since = new Date(Date.now() - 3_600_000).toISOString();
    if (config.maxGlobalRepliesPerHour > 0) {
      const globalReplies = await countRecentReplies(since);
      if (globalReplies >= config.maxGlobalRepliesPerHour) {
        return markSkipped(mention, "global_rate_limited", author);
      }
    }
    if (config.maxUserRepliesPerHour > 0) {
      const authorReplies = await countRecentReplies(since, mention.author_id);
      if (authorReplies >= config.maxUserRepliesPerHour) {
        return markSkipped(mention, "user_rate_limited", author);
      }
    }

    let referencedText: string | null = null;
    if (mention.referenced_tweet_id) {
      try {
        referencedText = await fetchTweetTextById(mention.referenced_tweet_id);
      } catch (error) {
        console.warn(eventName("mention.parent_context_failed"), {
          mentionId: mention.id,
          referencedTweetId: mention.referenced_tweet_id,
          error: safeErrorMessage(error)
        });
      }
    }

    const replyText = await generateReplyText(mention.text, { referencedText });
    if (config.dryRun) {
      await updateProcessedMention(mention.id, { status: "dry_run", error: null });
      if (followerThresholdEnabled) {
        logEvent(eventName("mention.auto_trade_skipped"), { mentionId: mention.id, reason: "dry_run", followerCount: authorFollowers });
      }
      logEvent(eventName("mention.dry_run"), {
        mentionId: mention.id,
        authorId: mention.author_id,
        authorUsername: author.username,
        replyText
      });
      return { mentionId: mention.id, status: "dry_run" };
    }

    const replyId = await replyToMentionWithText(mention.id, replyText);
    await updateProcessedMention(mention.id, {
      status: "replied",
      error: null,
      replyId,
      authorUsername: author.username ?? null
    });
    logEvent(eventName("mention.replied"), {
      mentionId: mention.id,
      authorId: mention.author_id,
      authorUsername: author.username,
      replyId
    });

    if (config.autoTradeEnabled && !config.dryRun && !followerThresholdBlocked) {
      const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
      const recentByCaller = await countRecentAutoTradesByAuthor(oneHourAgo, mention.author_id);

      if (config.autoTradeMaxConsecutivePerCaller > 0 && recentByCaller >= config.autoTradeMaxConsecutivePerCaller) {
        logEvent(eventName("mention.auto_trade_skipped"), {
          mentionId: mention.id,
          reason: "caller_rate_limit",
          recentByCaller
        });
      } else {
        const tradeResult = await executeAutoTradeFromMention({
          mentionId: mention.id,
          mentionText: mention.text,
          authorId: mention.author_id,
          authorUsername: author.username ?? null,
          authorFollowers
        });
        logEvent(eventName("mention.auto_trade_result"), {
          mentionId: mention.id,
          authorId: mention.author_id,
          tradeResultKind: tradeResult.kind,
          reason: tradeResult.kind === "failed" || tradeResult.kind === "already_processed" ? tradeResult.reason : undefined,
          signature: tradeResult.kind === "success" ? tradeResult.signature : undefined
        });
      }
    }

    if (config.autoTradeEnabled && config.dryRun && !followerThresholdBlocked) {
      logEvent(eventName("mention.auto_trade_skipped"), {
        mentionId: mention.id,
        reason: "dry_run"
      });
    }

    if (config.autoTradeEnabled && followerThresholdBlocked) {
      logEvent(eventName("mention.auto_trade_skipped"), {
        mentionId: mention.id,
        reason: "follower_gate",
        authorFollowers,
        threshold: config.autoTradeFollowerThreshold
      });
    }

    return { mentionId: mention.id, status: "replied", replyId };
  } catch (error) {
    const reason = safeErrorMessage(error);
    await updateProcessedMention(mention.id, { status: "failed", error: reason });
    console.error(eventName("mention.failed"), {
      mentionId: mention.id,
      authorId: mention.author_id,
      error
    });
    return { mentionId: mention.id, status: "failed", reason };
  }
}

export async function runBotOnce(source = "manual"): Promise<PollRunResult> {
  const config = getConfig();
  const startedAt = new Date().toISOString();
  const mentions = await fetchRecentMentions(config.maxMentionsPerPoll);
  const outcomes: MentionProcessOutcome[] = [];

  for (const mention of [...mentions].reverse()) {
    outcomes.push(await processMention(mention));
  }

  const result: PollRunResult = {
    source,
    dryRun: config.dryRun,
    fetched: mentions.length,
    processed: outcomes.filter((outcome) => outcome.status !== "duplicate").length,
    replied: outcomes.filter((outcome) => outcome.status === "replied").length,
    dryRunCount: outcomes.filter((outcome) => outcome.status === "dry_run").length,
    skipped: outcomes.filter((outcome) => outcome.status === "skipped" || outcome.status === "duplicate").length,
    failed: outcomes.filter((outcome) => outcome.status === "failed").length,
    outcomes,
    startedAt,
    finishedAt: new Date().toISOString()
  };

  logEvent(eventName("poll.complete"), result);
  return result;
}
