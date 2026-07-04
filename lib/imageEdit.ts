import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import sharp from "sharp";

import { botConfig } from "./botConfig";
import { getConfig } from "./config";
import { NonRetryableError, NonRetryableHttpError, throwForBadResponse, withRetry } from "./retry";

export class UnsafeImageError extends NonRetryableError {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeImageError";
  }
}

export class UnavailableImageError extends NonRetryableError {
  constructor(message: string) {
    super(message);
    this.name = "UnavailableImageError";
  }
}

export type TransformationImageResult = {
  filePath: string;
  provider: "openai" | "replicate" | "sharp";
  sourceImageUrl: string;
};

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
};

type ModerationResponse = {
  results?: Array<{
    flagged?: boolean;
    categories?: Record<string, boolean>;
  }>;
};

type ReplicatePrediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown;
  error?: string | null;
  urls?: {
    get?: string;
  };
};

function truncate(input: string, maxLength = 1000) {
  return input.length > maxLength ? `${input.slice(0, maxLength)}...` : input;
}

function bufferToDataUrl(buffer: Buffer, mimeType = "image/png") {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

async function fetchBuffer(url: string, label: string, maxBytes?: number) {
  const config = getConfig();

  return withRetry(label, async () => {
    const response = await fetch(url, {
      headers: {
        "User-Agent": config.userAgent
      }
    });

    if (response.status === 403 || response.status === 404 || response.status === 410) {
      throw new UnavailableImageError(`${label} unavailable with HTTP ${response.status}`);
    }

    await throwForBadResponse(label, response);

    const contentLength = response.headers.get("content-length");
    if (contentLength && maxBytes && Number.parseInt(contentLength, 10) > maxBytes) {
      throw new UnavailableImageError(`${label} exceeds maximum allowed size`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (maxBytes && buffer.byteLength > maxBytes) {
      throw new UnavailableImageError(`${label} exceeds maximum allowed size`);
    }

    return buffer;
  });
}

async function normalizeToPng(buffer: Buffer) {
  try {
    return await sharp(buffer, { animated: false })
      .rotate()
      .resize({
        width: 1024,
        height: 1024,
        fit: "inside",
        withoutEnlargement: true
      })
      .png()
      .toBuffer();
  } catch {
    throw new UnavailableImageError("Profile image could not be decoded");
  }
}

async function assertImageIsSafe(buffer: Buffer) {
  const config = getConfig();
  if (!config.moderationEnabled) {
    return;
  }

  if (!config.openaiApiKey) {
    if (config.requireImageModeration) {
      throw new Error("OPENAI_API_KEY is required when REQUIRE_IMAGE_MODERATION=true");
    }

    return;
  }

  const response = await withRetry("openai.moderations", async () => {
    const moderationResponse = await fetch(`${config.openaiBaseUrl}/moderations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.openaiModerationModel,
        input: [
          {
            type: "image_url",
            image_url: {
              url: bufferToDataUrl(buffer)
            }
          }
        ]
      })
    });

    await throwForBadResponse("OpenAI moderations", moderationResponse);
    return (await moderationResponse.json()) as ModerationResponse;
  });

  const result = response.results?.[0];
  if (!result) {
    throw new Error("OpenAI moderation response did not include a result");
  }

  const categories = result.categories ?? {};
  const explicitCategories = ["sexual", "sexual/minors", "violence/graphic"];
  const isExplicit = explicitCategories.some((category) => categories[category]);

  if (result.flagged || isExplicit) {
    throw new UnsafeImageError("Profile image was flagged by moderation");
  }
}

async function openAIImageEdit(buffer: Buffer, imageFieldName: "image[]" | "image") {
  const config = getConfig();
  if (!config.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const formData = new FormData();
  formData.append("model", config.openaiImageModel);
  formData.append("prompt", botConfig.imagePrompt);
  formData.append("n", "1");
  formData.append(imageFieldName, new Blob([new Uint8Array(buffer)], { type: "image/png" }), "profile.png");

  const response = await fetch(`${config.openaiBaseUrl}/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`
    },
    body: formData
  });

  await throwForBadResponse("OpenAI image edit", response);
  const payload = (await response.json()) as OpenAIImageResponse;
  const image = payload.data?.[0];

  if (image?.b64_json) {
    return Buffer.from(image.b64_json, "base64");
  }

  if (image?.url) {
    return fetchBuffer(image.url, "openai.generated_image");
  }

  throw new Error("OpenAI image edit response did not include an image");
}

async function editWithOpenAI(buffer: Buffer) {
  try {
    return await withRetry("openai.image_edit", () => openAIImageEdit(buffer, "image[]"));
  } catch (error) {
    if (error instanceof NonRetryableHttpError && error.status === 400) {
      return withRetry("openai.image_edit_legacy_field", () => openAIImageEdit(buffer, "image"));
    }

    throw error;
  }
}

async function createReplicatePrediction(buffer: Buffer) {
  const config = getConfig();
  if (!config.replicateApiToken || !config.replicateModel) {
    throw new Error("REPLICATE_API_TOKEN and REPLICATE_MODEL are required");
  }

  const response = await fetch(`${config.replicateBaseUrl}/models/${config.replicateModel}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.replicateApiToken}`,
      "Content-Type": "application/json",
      Prefer: `wait=${config.replicateWaitSeconds}`
    },
    body: JSON.stringify({
      input: {
        [config.replicatePromptField]: botConfig.imagePrompt,
        [config.replicateImageField]: bufferToDataUrl(buffer)
      }
    })
  });

  await throwForBadResponse("Replicate prediction", response);
  return (await response.json()) as ReplicatePrediction;
}

async function fetchReplicatePrediction(url: string) {
  const config = getConfig();

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.replicateApiToken}`
    }
  });

  await throwForBadResponse("Replicate prediction poll", response);
  return (await response.json()) as ReplicatePrediction;
}

function extractReplicateOutputUrl(output: unknown): string | undefined {
  if (typeof output === "string") {
    return output;
  }

  if (Array.isArray(output)) {
    const firstString = output.find((item) => typeof item === "string");
    if (firstString) {
      return firstString;
    }
  }

  if (output && typeof output === "object") {
    const candidate = (output as { url?: unknown }).url;
    if (typeof candidate === "string") {
      return candidate;
    }
  }

  return undefined;
}

async function editWithReplicate(buffer: Buffer) {
  const config = getConfig();
  let prediction = await withRetry("replicate.prediction.create", () => createReplicatePrediction(buffer));

  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (prediction.status === "succeeded") {
      const outputUrl = extractReplicateOutputUrl(prediction.output);
      if (!outputUrl) {
        throw new Error("Replicate prediction succeeded but did not include an image URL output");
      }

      return fetchBuffer(outputUrl, "replicate.generated_image");
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      throw new Error(`Replicate prediction ${prediction.status}: ${prediction.error ?? "unknown error"}`);
    }

    if (!prediction.urls?.get) {
      throw new Error("Replicate prediction did not include a polling URL");
    }

    await sleep(config.replicatePollIntervalMs);
    prediction = await withRetry("replicate.prediction.poll", () => fetchReplicatePrediction(prediction.urls?.get as string));
  }

  throw new Error("Replicate prediction timed out");
}

async function addBullHornsWithSharp(buffer: Buffer) {
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width ?? 1024;
  const height = metadata.height ?? 1024;
  const hornStroke = Math.max(14, Math.round(width * 0.045));
  const highlightStroke = Math.max(4, Math.round(width * 0.014));
  const shadowBlur = Math.max(2, Math.round(width * 0.008));

  const overlay = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="leftHorn" x1="100%" x2="0%" y1="100%" y2="0%">
          <stop offset="0%" stop-color="#141414"/>
          <stop offset="45%" stop-color="#77786f"/>
          <stop offset="100%" stop-color="#f3f0e5"/>
        </linearGradient>
        <linearGradient id="rightHorn" x1="0%" x2="100%" y1="100%" y2="0%">
          <stop offset="0%" stop-color="#141414"/>
          <stop offset="45%" stop-color="#77786f"/>
          <stop offset="100%" stop-color="#f3f0e5"/>
        </linearGradient>
        <filter id="hornShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="${Math.max(2, Math.round(height * 0.006))}" stdDeviation="${shadowBlur}" flood-color="#000000" flood-opacity="0.35"/>
        </filter>
      </defs>
      <path d="M ${width * 0.41} ${height * 0.31} C ${width * 0.27} ${height * 0.27}, ${width * 0.16} ${height * 0.15}, ${width * 0.11} ${height * 0.045}"
        fill="none" stroke="url(#leftHorn)" stroke-width="${hornStroke}" stroke-linecap="round" filter="url(#hornShadow)"/>
      <path d="M ${width * 0.59} ${height * 0.31} C ${width * 0.73} ${height * 0.27}, ${width * 0.84} ${height * 0.15}, ${width * 0.89} ${height * 0.045}"
        fill="none" stroke="url(#rightHorn)" stroke-width="${hornStroke}" stroke-linecap="round" filter="url(#hornShadow)"/>
      <path d="M ${width * 0.40} ${height * 0.295} C ${width * 0.27} ${height * 0.24}, ${width * 0.18} ${height * 0.13}, ${width * 0.125} ${height * 0.045}"
        fill="none" stroke="#ffffff" stroke-opacity="0.36" stroke-width="${highlightStroke}" stroke-linecap="round"/>
      <path d="M ${width * 0.60} ${height * 0.295} C ${width * 0.73} ${height * 0.24}, ${width * 0.82} ${height * 0.13}, ${width * 0.875} ${height * 0.045}"
        fill="none" stroke="#ffffff" stroke-opacity="0.36" stroke-width="${highlightStroke}" stroke-linecap="round"/>
    </svg>
  `);

  return sharp(buffer).composite([{ input: overlay, top: 0, left: 0, blend: "over" }]).png().toBuffer();
}

async function unusedLegacyPfpWithSharp(buffer: Buffer) {
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width ?? 1024;
  const height = metadata.height ?? 1024;

  const overlay = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="vignette" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="72%" stop-color="#111111" stop-opacity="0.04"/>
          <stop offset="100%" stop-color="#050505" stop-opacity="0.28"/>
        </radialGradient>
        <linearGradient id="flash" x1="0%" x2="100%" y1="0%" y2="10%">
          <stop offset="0%" stop-color="#ffe8a8" stop-opacity="0.10"/>
          <stop offset="54%" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="100%" stop-color="#ff6b1f" stop-opacity="0.22"/>
        </radialGradient>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/>
          <feColorMatrix type="saturate" values="0"/>
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.06"/>
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#flash)"/>
      <rect width="100%" height="100%" fill="url(#vignette)"/>
      <rect width="100%" height="100%" filter="url(#grain)" opacity="0.55"/>
    </svg>
  `);

  return sharp(buffer)
    .modulate({ brightness: 1.04, saturation: 1.12 })
    .composite([{ input: overlay, top: 0, left: 0, blend: "over" }])
    .png()
    .toBuffer();
}

async function editImage(buffer: Buffer): Promise<{ buffer: Buffer; provider: TransformationImageResult["provider"] }> {
  const config = getConfig();
  const preferredProvider = config.imageProvider;

  if ((preferredProvider === "auto" || preferredProvider === "openai") && config.openaiApiKey) {
    try {
      return { buffer: await editWithOpenAI(buffer), provider: "openai" };
    } catch (error) {
      if (preferredProvider === "openai" || !config.sharpFallbackEnabled) {
        throw error;
      }

      console.warn("OpenAI image edit failed; falling back to Sharp", error);
    }
  }

  if ((preferredProvider === "auto" || preferredProvider === "replicate") && config.replicateApiToken) {
    try {
      return { buffer: await editWithReplicate(buffer), provider: "replicate" };
    } catch (error) {
      if (preferredProvider === "replicate" || !config.sharpFallbackEnabled) {
        throw error;
      }

      console.warn("Replicate image edit failed; falling back to Sharp", error);
    }
  }

  if (preferredProvider === "sharp" || config.sharpFallbackEnabled) {
    return { buffer: await addBullHornsWithSharp(buffer), provider: "sharp" };
  }

  throw new Error("No image edit provider is configured");
}

export async function createTransformationImage(sourceImageUrl: string, mentionId: string): Promise<TransformationImageResult> {
  const config = getConfig();
  const sourceImage = await fetchBuffer(sourceImageUrl, "profile_image", config.maxProfileImageBytes);
  const normalizedSourceImage = await normalizeToPng(sourceImage);

  await assertImageIsSafe(normalizedSourceImage);

  const editedImage = await editImage(normalizedSourceImage);
  const normalizedEditedImage = await normalizeToPng(editedImage.buffer);
  const tempDir = await fs.mkdtemp(path.join(tmpdir(), `${botConfig.tempFilePrefix}-`));
  const safeMentionId = mentionId.replace(/[^A-Za-z0-9_-]/g, "");
  const filePath = path.join(tempDir, `${safeMentionId || "mention"}.png`);

  await fs.writeFile(filePath, normalizedEditedImage);

  return {
    filePath,
    provider: editedImage.provider,
    sourceImageUrl
  };
}

export async function cleanupTransformationImage(result?: TransformationImageResult) {
  if (!result) {
    return;
  }

  await fs.rm(path.dirname(result.filePath), { recursive: true, force: true });
}

export function safeErrorMessage(error: unknown) {
  return truncate(error instanceof Error ? error.message : String(error));
}
