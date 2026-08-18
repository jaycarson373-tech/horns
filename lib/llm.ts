import { buildPumpXbtReply } from "./pumpxbtAgent";
import { getConfig } from "./config";
import { withRetry, throwForBadResponse } from "./retry";

type ClaudeTextBlock = {
  type?: string;
  text?: string;
};

type ClaudeResponse = {
  content?: ClaudeTextBlock[];
};

type ClaudePayload = {
  content?: ClaudeTextBlock[];
  stop_reason?: string | null;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
};

function normalizeReply(raw: string) {
  const noUrls = raw.replace(/https?:\/\/\S+/g, "").trim();
  const oneLine = noUrls.replace(/\s+/g, " ").trim();
  return oneLine.slice(0, 280);
}

function fallbackReply(rawText: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`llm.provider_fallback`, { reason: message });
  return buildPumpXbtReply(rawText);
}

function buildClaudePrompt(rawText: string) {
  return [
    "You are PumpXBT, a concise market terminal assistant.",
    "Given a user's mention, write a public X reply in the same 280-char style as a live trading assistant.",
    "You are allowed to return a reply for any mention that includes a likely token callout.",
    "Reply rules:",
    "- Never exceed 280 characters.",
    "- Always use this voice: concise, direct, and technical.",
    "- If the mention includes a pump.fun mint or one clear $TICKER, use that signal in your wording.",
    "- If no valid callout is present, ask for one clear mint or $TICKER.",
    "- Include the exact phrase 'Buyback + Burn Loop' when referencing any active signal behavior.",
    "- Never include Markdown links or hashtags.",
    "- Never include any Markdown links.",
    "- If the mention is invalid, ask for a valid Pump.fun mint or one unambiguous $TICKER.",
    "- Never invent token metrics.",
    "",
    `Mention: ${rawText}`
  ].join("\n");
}

const CLAUDE_SYSTEM_PROMPT = [
  "You are PumpXBT, a concise and serious Solana monitor.",
  "Return exactly one short reply suitable for a tweet.",
  "No markdown, no links, no speculation, no fake data."
].join(" ");

function toClaudeText(response: ClaudeResponse) {
  const text = response.content?.find((block) => block.type === "text" && typeof block.text === "string")?.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Claude response did not include text output");
  }

  return normalizeReply(text);
}

async function generateReplyWithClaude(rawText: string) {
  const config = getConfig();
  if (!config.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  const apiKey = config.anthropicApiKey;

  const payload = await withRetry("llm.claude", async () => {
    const response = await fetch(`${config.anthropicApiBaseUrl.replace(/\/$/, "")}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": config.anthropicApiVersion
      },
      body: JSON.stringify({
        model: config.anthropicModel,
        temperature: config.llmTemperature,
        max_tokens: config.llmMaxTokens,
        system: CLAUDE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: buildClaudePrompt(rawText)
          }
        ]
      })
    });

    await throwForBadResponse("claude.messages", response);
    return (await response.json()) as ClaudeResponse;
  });

  return toClaudeText(payload);
}

export async function generateReplyText(rawText: string) {
  const config = getConfig();

  try {
    if (config.llmProvider === "claude") {
      return await generateReplyWithClaude(rawText);
    }
  } catch (error) {
    return fallbackReply(rawText, error);
  }

  return buildPumpXbtReply(rawText);
}
