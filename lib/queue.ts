import { countRecentReplies, createProcessedMention, updateProcessedMention } from "./supabase";
import { getConfig } from "./config";
import { cleanupHornsImage, createHornsImage, safeErrorMessage, UnsafeImageError, UnavailableImageError, type HornsImageResult } from "./imageEdit";
import {
  fetchRecentMentions,
  fetchUserById,
  isDirectMention,
  replyToMentionWithImage,
  toHighestQualityProfileImageUrl,
  uploadImageForTweet,
  type XAuthor,
  type XMention
} from "./x";

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

function oneHourAgoIso() {
  return new Date(Date.now() - 60 * 60 * 1000).toISOString();
}

function isOlderThanLimit(createdAt: string | undefined, maxAgeMinutes: number) {
  if (!createdAt || maxAgeMinutes === 0) {
    return false;
  }

  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) {
    return false;
  }

  return Date.now() - created > maxAgeMinutes * 60 * 1000;
}

function isRetryableExistingStatus(status: string) {
  return status === "failed";
}

async function markSkipped(mention: XMention, reason: string, author?: XAuthor, profileImageUrl?: string): Promise<MentionProcessOutcome> {
  await updateProcessedMention(mention.id, {
    status: "skipped",
    error: reason,
    authorUsername: author?.username ?? null,
    profileImageUrl: profileImageUrl ?? author?.profile_image_url ?? null
  });

  logEvent("horns.mention.skipped", {
    mentionId: mention.id,
    authorId: mention.author_id,
    reason
  });

  return {
    mentionId: mention.id,
    status: "skipped",
    reason
  };
}

async function getAuthor(mention: XMention) {
  if (mention.author) {
    return mention.author;
  }

  return fetchUserById(mention.author_id);
}

async function processDryRun(mention: XMention, author: XAuthor, profileImageUrl: string) {
  const config = getConfig();
  let hornsImage: HornsImageResult | undefined;

  try {
    if (config.dryRunGenerateImage) {
      hornsImage = await createHornsImage(profileImageUrl, mention.id);
    }

    await updateProcessedMention(mention.id, {
      status: "dry_run",
      error: null,
      authorUsername: author.username ?? null,
      profileImageUrl
    });

    logEvent("horns.mention.dry_run", {
      mentionId: mention.id,
      authorId: mention.author_id,
      authorUsername: author.username,
      imageGenerated: Boolean(hornsImage),
      provider: hornsImage?.provider
    });

    return {
      mentionId: mention.id,
      status: "dry_run" as const
    };
  } finally {
    await cleanupHornsImage(hornsImage);
  }
}

async function enforceRateLimits(mention: XMention) {
  const config = getConfig();
  const since = oneHourAgoIso();
  const [authorReplyCount, globalReplyCount] = await Promise.all([
    countRecentReplies(since, mention.author_id),
    countRecentReplies(since)
  ]);

  if (authorReplyCount >= 1) {
    return "user_rate_limited";
  }

  if (globalReplyCount >= config.maxGlobalRepliesPerHour) {
    return "global_rate_limited";
  }

  return undefined;
}

async function processMention(mention: XMention): Promise<MentionProcessOutcome> {
  const config = getConfig();
  const initialProfileImageUrl = mention.author?.profile_image_url
    ? toHighestQualityProfileImageUrl(mention.author.profile_image_url)
    : undefined;

  const created = await createProcessedMention({
    mentionId: mention.id,
    authorId: mention.author_id,
    authorUsername: mention.author?.username,
    profileImageUrl: initialProfileImageUrl,
    status: "queued"
  });

  if (!created.created && !isRetryableExistingStatus(created.record?.status ?? "")) {
    return {
      mentionId: mention.id,
      status: "duplicate",
      reason: "already_processed"
    };
  }

  if (!created.created) {
    logEvent("horns.mention.retrying_failed", {
      mentionId: mention.id,
      authorId: mention.author_id,
      previousStatus: created.record?.status
    });
  }

  await updateProcessedMention(mention.id, { status: "processing" });

  try {
    if (!isDirectMention(mention.text, config.botUsername)) {
      return markSkipped(mention, "not_a_direct_mention", mention.author, initialProfileImageUrl);
    }

    if (mention.author_id === config.botUserId) {
      return markSkipped(mention, "self_mention", mention.author, initialProfileImageUrl);
    }

    if (isOlderThanLimit(mention.created_at, config.maxMentionAgeMinutes)) {
      return markSkipped(mention, "mention_too_old", mention.author, initialProfileImageUrl);
    }

    const author = await getAuthor(mention);
    if (!author) {
      return markSkipped(mention, "author_unavailable", mention.author, initialProfileImageUrl);
    }

    if (author.protected) {
      return markSkipped(mention, "protected_profile", author, initialProfileImageUrl);
    }

    if (!author.profile_image_url) {
      return markSkipped(mention, "profile_image_unavailable", author, initialProfileImageUrl);
    }

    const profileImageUrl = toHighestQualityProfileImageUrl(author.profile_image_url);
    await updateProcessedMention(mention.id, {
      authorUsername: author.username ?? null,
      profileImageUrl
    });

    const rateLimitReason = await enforceRateLimits(mention);
    if (rateLimitReason) {
      return markSkipped(mention, rateLimitReason, author, profileImageUrl);
    }

    if (config.dryRun) {
      return processDryRun(mention, author, profileImageUrl);
    }

    let hornsImage: HornsImageResult | undefined;
    try {
      hornsImage = await createHornsImage(profileImageUrl, mention.id);
      const mediaId = await uploadImageForTweet(hornsImage.filePath);
      const replyId = await replyToMentionWithImage(mention.id, mediaId);

      await updateProcessedMention(mention.id, {
        status: "replied",
        error: null,
        replyId,
        authorUsername: author.username ?? null,
        profileImageUrl
      });

      logEvent("horns.mention.replied", {
        mentionId: mention.id,
        authorId: mention.author_id,
        authorUsername: author.username,
        provider: hornsImage.provider,
        replyId
      });

      return {
        mentionId: mention.id,
        status: "replied",
        replyId
      };
    } finally {
      await cleanupHornsImage(hornsImage);
    }
  } catch (error) {
    const message = safeErrorMessage(error);
    const skipped = error instanceof UnsafeImageError || error instanceof UnavailableImageError;

    await updateProcessedMention(mention.id, {
      status: skipped ? "skipped" : "failed",
      error: message
    });

    console.error("horns.mention.failed", {
      mentionId: mention.id,
      authorId: mention.author_id,
      skipped,
      error
    });

    return {
      mentionId: mention.id,
      status: skipped ? "skipped" : "failed",
      reason: message
    };
  }
}

export async function runHornsOnce(source = "manual"): Promise<PollRunResult> {
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

  logEvent("horns.poll.complete", result);
  return result;
}
