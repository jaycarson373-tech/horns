import { promises as fs } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

import { TwitterApi } from "twitter-api-v2";

import { botConfig } from "./botConfig";
import { getConfig } from "./config";
import { NonRetryableError, throwForBadResponse, withRetry } from "./retry";

export type XAuthor = {
  id: string;
  name?: string;
  profile_image_url?: string;
  protected?: boolean;
  username?: string;
};

export type XMention = {
  id: string;
  text: string;
  author_id: string;
  created_at?: string;
  author?: XAuthor;
};

type XTweetResponse = {
  data?: Array<{
    id: string;
    text: string;
    author_id?: string;
    created_at?: string;
  }>;
  includes?: {
    users?: XAuthor[];
  };
};

type XUserResponse = {
  data?: XAuthor;
};

type XCreateTweetResponse = {
  data?: {
    id?: string;
    text?: string;
  };
};

type XMediaUploadResponse = {
  data?: {
    id?: string;
    media_id?: string;
    media_key?: string;
    processing_info?: {
      state?: "pending" | "in_progress" | "succeeded" | "failed";
      check_after_secs?: number;
      error?: {
        message?: string;
      };
    };
  };
};

type XMediaProcessingInfo = NonNullable<NonNullable<XMediaUploadResponse["data"]>["processing_info"]>;

let writeClient: TwitterApi | undefined;

function getWriteClient() {
  if (!writeClient) {
    const config = getConfig();
    if (!config.xApiKey || !config.xApiSecret || !config.xAccessToken || !config.xAccessTokenSecret) {
      throw new Error("X OAuth 1.0a write credentials are required to upload media and reply");
    }

    writeClient = new TwitterApi({
      appKey: config.xApiKey,
      appSecret: config.xApiSecret,
      accessToken: config.xAccessToken,
      accessSecret: config.xAccessTokenSecret
    });
  }

  return writeClient;
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isDirectMention(text: string, botUsername: string) {
  const username = botUsername.replace(/^@+/, "");
  return new RegExp(`(^|[^A-Za-z0-9_])@${escapeRegExp(username)}\\b`, "i").test(text);
}

export function toHighestQualityProfileImageUrl(profileImageUrl: string) {
  const url = new URL(profileImageUrl);
  url.pathname = url.pathname.replace(/_(normal|bigger|mini)(\.[^.]+)$/i, "$2");
  return url.toString();
}

function summarizeXApiError(error: unknown) {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }

  const record = error as Record<string, unknown>;
  return {
    name: record.name,
    message: record.message,
    code: record.code,
    status: record.status,
    data: record.data,
    errors: record.errors,
    rateLimit: record.rateLimit
  };
}

function xApiErrorText(error: unknown) {
  const summary = summarizeXApiError(error);
  return JSON.stringify(summary).toLowerCase();
}

function isPossiblyDuplicateReplyError(error: unknown) {
  const text = xApiErrorText(error);
  return text.includes("duplicate") || text.includes("already") || text.includes("code 187");
}

function replyTextsToTry() {
  return [botConfig.replyText, ...botConfig.replyTextFallbacks].filter(
    (replyText, index, all) => all.indexOf(replyText) === index
  );
}

async function xApiGet<T>(path: string, params?: Record<string, string>) {
  const config = getConfig();
  const url = new URL(`${config.xApiBaseUrl}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  return withRetry(`x.get.${path}`, async () => {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.xBearerToken}`,
        "User-Agent": config.userAgent
      }
    });

    await throwForBadResponse(`X GET ${path}`, response);
    return (await response.json()) as T;
  });
}

async function xOAuth2Get<T>(path: string, params?: Record<string, string>) {
  const config = getConfig();
  if (!config.xOAuth2UserToken) {
    throw new Error("X_OAUTH2_USER_TOKEN is required for X OAuth2 write requests");
  }

  const url = new URL(`${config.xApiBaseUrl}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  return withRetry(`x.oauth2.get.${path}`, async () => {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.xOAuth2UserToken}`,
        "User-Agent": config.userAgent
      }
    });

    await throwForBadResponse(`X OAuth2 GET ${path}`, response);
    return (await response.json()) as T;
  });
}

async function xOAuth2PostJson<T>(path: string, body: unknown) {
  const config = getConfig();
  if (!config.xOAuth2UserToken) {
    throw new Error("X_OAUTH2_USER_TOKEN is required for X OAuth2 write requests");
  }

  return withRetry(`x.oauth2.post.${path}`, async () => {
    const response = await fetch(`${config.xApiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.xOAuth2UserToken}`,
        "Content-Type": "application/json",
        "User-Agent": config.userAgent
      },
      body: JSON.stringify(body)
    });

    await throwForBadResponse(`X OAuth2 POST ${path}`, response);
    return (await response.json()) as T;
  });
}

async function xOAuth2PostForm<T>(path: string, formData: FormData) {
  const config = getConfig();
  if (!config.xOAuth2UserToken) {
    throw new Error("X_OAUTH2_USER_TOKEN is required for X OAuth2 write requests");
  }

  return withRetry(`x.oauth2.form.${path}`, async () => {
    const response = await fetch(`${config.xApiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.xOAuth2UserToken}`,
        "User-Agent": config.userAgent
      },
      body: formData
    });

    await throwForBadResponse(`X OAuth2 form ${path}`, response);
    return (await response.json()) as T;
  });
}

export async function fetchRecentMentions(limit?: number): Promise<XMention[]> {
  const config = getConfig();
  const maxResults = String(limit ?? config.maxMentionsPerPoll);
  const response = await xApiGet<XTweetResponse>(`/users/${config.botUserId}/mentions`, {
    max_results: maxResults,
    expansions: "author_id",
    "tweet.fields": "author_id,created_at",
    "user.fields": "id,name,username,profile_image_url,protected"
  });

  const usersById = new Map((response.includes?.users ?? []).map((user) => [user.id, user]));

  return (response.data ?? [])
    .filter((tweet) => tweet.author_id)
    .map((tweet) => ({
      id: tweet.id,
      text: tweet.text,
      author_id: tweet.author_id as string,
      created_at: tweet.created_at,
      author: usersById.get(tweet.author_id as string)
    }));
}

export async function fetchUserById(userId: string) {
  const response = await xApiGet<XUserResponse>(`/users/${userId}`, {
    "user.fields": "id,name,username,profile_image_url,protected"
  });

  return response.data;
}

export async function uploadImageForTweet(imagePath: string) {
  const config = getConfig();
  if (config.xOAuth2UserToken) {
    console.info("x.media.upload.auth_path", { auth: "oauth2_user_context" });
    return uploadImageForTweetWithOAuth2(imagePath);
  }

  console.info("x.media.upload.auth_path", { auth: "oauth1_user_context" });
  return withRetry("x.media.upload", async () => {
    const image = await fs.readFile(imagePath);

    try {
      const mediaId = await getWriteClient().v2.uploadMedia(image, {
        media_type: "image/png",
        media_category: "tweet_image"
      });

      console.info("x.media.upload.success", { endpoint: "v2" });
      return mediaId;
    } catch (v2Error) {
      console.warn("x.media.upload.v2_failed_falling_back", summarizeXApiError(v2Error));
    }

    try {
      const mediaId = await getWriteClient().v1.uploadMedia(imagePath, {
        mimeType: "image/png",
        target: "tweet"
      });

      console.info("x.media.upload.success", { endpoint: "v1.1" });
      return mediaId;
    } catch (v1Error) {
      console.error("x.media.upload.failed", summarizeXApiError(v1Error));
      throw v1Error;
    }
  });
}

async function uploadImageForTweetWithOAuth2(imagePath: string) {
  const image = await fs.readFile(imagePath);

  const initForm = new FormData();
  initForm.append("command", "INIT");
  initForm.append("media_type", "image/png");
  initForm.append("media_category", "tweet_image");
  initForm.append("total_bytes", String(image.byteLength));

  const init = await xOAuth2PostForm<XMediaUploadResponse>("/media/upload", initForm);
  const mediaId = init.data?.id ?? init.data?.media_id;
  if (!mediaId) {
    throw new NonRetryableError("X media INIT response did not include a media id");
  }

  const appendForm = new FormData();
  appendForm.append("command", "APPEND");
  appendForm.append("media_id", mediaId);
  appendForm.append("segment_index", "0");
  appendForm.append("media", new Blob([new Uint8Array(image)], { type: "image/png" }), botConfig.mediaFilename);
  await xOAuth2PostForm<XMediaUploadResponse>("/media/upload", appendForm);

  const finalizeForm = new FormData();
  finalizeForm.append("command", "FINALIZE");
  finalizeForm.append("media_id", mediaId);
  const finalized = await xOAuth2PostForm<XMediaUploadResponse>("/media/upload", finalizeForm);

  await waitForMediaProcessing(mediaId, finalized.data?.processing_info);
  return mediaId;
}

async function waitForMediaProcessing(mediaId: string, processingInfo?: XMediaProcessingInfo) {
  let current = processingInfo;

  for (let attempt = 0; current && attempt < 30; attempt += 1) {
    if (current.state === "succeeded") {
      return;
    }

    if (current.state === "failed") {
      throw new NonRetryableError(`X media processing failed: ${current.error?.message ?? "unknown error"}`);
    }

    await sleep((current.check_after_secs ?? 1) * 1000);
    const status = await xOAuth2Get<XMediaUploadResponse>("/media/upload", {
      command: "STATUS",
      media_id: mediaId
    });
    current = status.data?.processing_info;
  }

  if (current) {
    throw new Error("X media processing timed out");
  }
}

export async function replyToMentionWithImage(mentionId: string, mediaId: string) {
  const config = getConfig();
  if (config.xOAuth2UserToken) {
    for (const text of replyTextsToTry()) {
      try {
        const response = await xOAuth2PostJson<XCreateTweetResponse>("/tweets", {
          text,
          made_with_ai: true,
          reply: {
            in_reply_to_tweet_id: mentionId
          },
          media: {
            media_ids: [mediaId]
          }
        });

        const replyId = response.data?.id;
        if (!replyId) {
          throw new NonRetryableError("X create tweet response did not include a reply id");
        }

        return replyId;
      } catch (error) {
        console.error("x.reply.failed", { text, ...summarizeXApiError(error) });
        if (!isPossiblyDuplicateReplyError(error)) {
          throw error;
        }
      }
    }

    throw new NonRetryableError("X rejected all Catify reply text variants");
  }

  return withRetry("x.reply", async () => {
    for (const text of replyTextsToTry()) {
      const payload = {
        text,
        made_with_ai: true,
        reply: {
          in_reply_to_tweet_id: mentionId
        },
        media: {
          media_ids: [mediaId]
        }
      };

      try {
        const response = await getWriteClient().v2.tweet(payload as any);

        const replyId = response.data?.id;
        if (!replyId) {
          throw new NonRetryableError("X create tweet response did not include a reply id");
        }

        return replyId;
      } catch (error) {
        console.error("x.reply.failed", { text, ...summarizeXApiError(error) });
        if (!isPossiblyDuplicateReplyError(error)) {
          throw error;
        }
      }
    }

    throw new NonRetryableError("X rejected all Catify reply text variants");
  });
}
