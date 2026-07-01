import { botConfig } from "./botConfig";

export type ImageProvider = "auto" | "openai" | "replicate" | "sharp";

export type AppConfig = {
  botUsername: string;
  botUserId: string;
  botProjectKey: string;
  cronSecret?: string;
  dryRun: boolean;
  dryRunGenerateImage: boolean;
  imageProvider: ImageProvider;
  maxGlobalRepliesPerHour: number;
  maxMentionAgeMinutes: number;
  maxMentionsPerPoll: number;
  maxProfileImageBytes: number;
  moderationEnabled: boolean;
  openaiApiKey?: string;
  openaiBaseUrl: string;
  openaiImageModel: string;
  openaiModerationModel: string;
  pollIntervalMs: number;
  replicateApiToken?: string;
  replicateBaseUrl: string;
  replicateImageField: string;
  replicateModel?: string;
  replicatePollIntervalMs: number;
  replicatePromptField: string;
  replicateWaitSeconds: number;
  requireImageModeration: boolean;
  sharpFallbackEnabled: boolean;
  supabaseServiceRoleKey: string;
  supabaseUrl: string;
  userAgent: string;
  xAccessToken?: string;
  xAccessTokenSecret?: string;
  xApiBaseUrl: string;
  xApiKey?: string;
  xApiSecret?: string;
  xBearerToken: string;
  xOAuth2UserToken?: string;
};

function env(name: string) {
  let value = process.env[name]?.trim();
  if (value && value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      value = value.slice(1, -1).trim();
    }
  }

  return value ? value : undefined;
}

function required(name: string) {
  const value = env(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readBoolean(name: string, fallback: boolean) {
  const value = env(name);
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function readInteger(name: string, fallback: number, options?: { min?: number; max?: number }) {
  const rawValue = env(name);
  if (rawValue === undefined) {
    return fallback;
  }

  const value = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be an integer`);
  }

  if (options?.min !== undefined && value < options.min) {
    throw new Error(`${name} must be >= ${options.min}`);
  }

  if (options?.max !== undefined && value > options.max) {
    throw new Error(`${name} must be <= ${options.max}`);
  }

  return value;
}

function readImageProvider(): ImageProvider {
  const provider = env("IMAGE_PROVIDER") ?? "auto";
  if (provider === "auto" || provider === "openai" || provider === "replicate" || provider === "sharp") {
    return provider;
  }

  throw new Error("IMAGE_PROVIDER must be one of: auto, openai, replicate, sharp");
}

function stripLeadingAt(username: string) {
  return username.replace(/^@+/, "").toLowerCase();
}

function defaultBotProjectKey() {
  return botConfig.botName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getConfig(): AppConfig {
  const dryRun = readBoolean("DRY_RUN", true);
  const dryRunGenerateImage = readBoolean("DRY_RUN_GENERATE_IMAGE", false);
  const imageProvider = readImageProvider();
  const openaiApiKey = env("OPENAI_API_KEY");
  const replicateApiToken = env("REPLICATE_API_TOKEN");
  const replicateModel = env("REPLICATE_MODEL");
  const sharpFallbackEnabled = readBoolean("SHARP_FALLBACK_ENABLED", false);
  const needsImageProvider = !dryRun || dryRunGenerateImage;

  if (needsImageProvider) {
    if (imageProvider === "openai" && !openaiApiKey) {
      throw new Error("OPENAI_API_KEY is required when IMAGE_PROVIDER=openai");
    }

    if (imageProvider === "replicate" && (!replicateApiToken || !replicateModel)) {
      throw new Error("REPLICATE_API_TOKEN and REPLICATE_MODEL are required when IMAGE_PROVIDER=replicate");
    }

    if (imageProvider === "auto" && !openaiApiKey && (!replicateApiToken || !replicateModel) && !sharpFallbackEnabled) {
      throw new Error("Set OPENAI_API_KEY, or REPLICATE_API_TOKEN plus REPLICATE_MODEL, before disabling dry run");
    }
  }

  if (!dryRun && !env("X_OAUTH2_USER_TOKEN")) {
    required("X_API_KEY");
    required("X_API_SECRET");
    required("X_ACCESS_TOKEN");
    required("X_ACCESS_TOKEN_SECRET");
  }

  return {
    botUsername: stripLeadingAt(env("BOT_USERNAME") ?? botConfig.defaultBotUsername),
    botUserId: required("BOT_USER_ID"),
    botProjectKey: env("BOT_PROJECT_KEY") ?? defaultBotProjectKey(),
    cronSecret: env("CRON_SECRET"),
    dryRun,
    dryRunGenerateImage,
    imageProvider,
    maxGlobalRepliesPerHour: readInteger("MAX_GLOBAL_REPLIES_PER_HOUR", 20, { min: 0 }),
    maxMentionAgeMinutes: readInteger("MAX_MENTION_AGE_MINUTES", 1440, { min: 0 }),
    maxMentionsPerPoll: readInteger("MAX_MENTIONS_PER_POLL", 20, { min: 5, max: 100 }),
    maxProfileImageBytes: readInteger("MAX_PROFILE_IMAGE_BYTES", 10_000_000, { min: 100_000 }),
    moderationEnabled: readBoolean("MODERATION_ENABLED", true),
    openaiApiKey,
    openaiBaseUrl: env("OPENAI_BASE_URL") ?? "https://api.openai.com/v1",
    openaiImageModel: env("OPENAI_IMAGE_MODEL") ?? "gpt-image-1.5",
    openaiModerationModel: env("OPENAI_MODERATION_MODEL") ?? "omni-moderation-latest",
    pollIntervalMs: readInteger("POLL_INTERVAL_MS", 60_000, { min: 10_000 }),
    replicateApiToken,
    replicateBaseUrl: env("REPLICATE_BASE_URL") ?? "https://api.replicate.com/v1",
    replicateImageField: env("REPLICATE_IMAGE_FIELD") ?? "image",
    replicateModel,
    replicatePollIntervalMs: readInteger("REPLICATE_POLL_INTERVAL_MS", 2000, { min: 500 }),
    replicatePromptField: env("REPLICATE_PROMPT_FIELD") ?? "prompt",
    replicateWaitSeconds: readInteger("REPLICATE_WAIT_SECONDS", 60, { min: 1, max: 60 }),
    requireImageModeration: readBoolean("REQUIRE_IMAGE_MODERATION", false),
    sharpFallbackEnabled,
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    supabaseUrl: required("SUPABASE_URL"),
    userAgent: env("USER_AGENT") ?? botConfig.userAgent,
    xAccessToken: env("X_ACCESS_TOKEN"),
    xAccessTokenSecret: env("X_ACCESS_TOKEN_SECRET"),
    xApiBaseUrl: env("X_API_BASE_URL") ?? "https://api.x.com/2",
    xApiKey: env("X_API_KEY"),
    xApiSecret: env("X_API_SECRET"),
    xBearerToken: required("X_BEARER_TOKEN"),
    xOAuth2UserToken: env("X_OAUTH2_USER_TOKEN")
  };
}
