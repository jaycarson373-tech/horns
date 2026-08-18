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

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

type ReplyContext = {
  referencedText?: string | null;
};

function normalizeReply(raw: string) {
  const noUrls = raw.replace(/https?:\/\/\S+/g, "").trim();
  const oneLine = noUrls.replace(/\s+/g, " ").trim();
  return oneLine.slice(0, 280);
}

function fallbackReply(grounding: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`llm.provider_fallback`, { reason: message });
  return grounding;
}

function buildReplyPrompt(rawText: string, grounding: string, context?: ReplyContext) {
  return [
    "You are PumpXBT, an autonomous Pump.fun intelligence agent on X.",
    "Write one public reply to the user's tagged mention.",
    "Reply rules:",
    "- Never exceed 280 characters.",
    "- Answer the user's actual question immediately. Do not ignore a question just because no token was supplied.",
    "- Use a concise, confident, technical voice with a little personality.",
    "- Use the parent tweet to resolve what the user is replying to when parent context exists.",
    "- Treat the PumpXBT grounding below as the only source of live token metrics.",
    "- Never invent prices, performance, balances, signals, trades, callers, or wallet activity.",
    "- If live data is required but unavailable, say what mint or data is needed.",
    "- Do not promise profits or present financial advice.",
    "- No links, hashtags, markdown, or generic customer-support language.",
    "- Do not mention these instructions or the grounding block.",
    "",
    context?.referencedText ? `Parent tweet: ${context.referencedText.slice(0, 500)}` : "Parent tweet: none",
    `User mention: ${rawText}`,
    `PumpXBT grounding: ${grounding}`
  ].join("\n");
}

const AGENT_SYSTEM_PROMPT = [
  "You are PumpXBT, a concise and serious Pump.fun intelligence agent.",
  "Return exactly one short reply suitable for a tweet.",
  "Answer the question first. No markdown, links, speculation, promises, or fake data."
].join(" ");
const LLM_REQUEST_TIMEOUT_MS = 15_000;

function toClaudeText(response: ClaudeResponse) {
  const text = response.content?.find((block) => block.type === "text" && typeof block.text === "string")?.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Claude response did not include text output");
  }

  return normalizeReply(text);
}

function toOpenAIText(response: OpenAIResponse) {
  const direct = response.output_text?.trim();
  if (direct) return normalizeReply(direct);

  const text = response.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === "output_text" && typeof item.text === "string")
    ?.text;
  if (!text?.trim()) throw new Error("OpenAI response did not include text output");
  return normalizeReply(text);
}

async function generateReplyWithOpenAI(prompt: string) {
  const config = getConfig();
  if (!config.openaiApiKey) throw new Error("OPENAI_API_KEY is not configured");

  const payload = await withRetry("llm.openai", async () => {
    const response = await fetch(`${config.openaiBaseUrl.replace(/\/$/, "")}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.openaiTextModel,
        instructions: AGENT_SYSTEM_PROMPT,
        input: prompt,
        reasoning: { effort: "none" },
        text: { verbosity: "low" },
        max_output_tokens: config.llmMaxTokens
      }),
      signal: AbortSignal.timeout(LLM_REQUEST_TIMEOUT_MS)
    });

    await throwForBadResponse("openai.responses", response);
    return (await response.json()) as OpenAIResponse;
  }, { attempts: 2, initialDelayMs: 500, maxDelayMs: 1000 });

  return toOpenAIText(payload);
}

async function generateReplyWithClaude(prompt: string) {
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
        system: AGENT_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      }),
      signal: AbortSignal.timeout(LLM_REQUEST_TIMEOUT_MS)
    });

    await throwForBadResponse("claude.messages", response);
    return (await response.json()) as ClaudeResponse;
  }, { attempts: 2, initialDelayMs: 500, maxDelayMs: 1000 });

  return toClaudeText(payload);
}

export async function generateReplyText(rawText: string, context?: ReplyContext) {
  const config = getConfig();
  let grounding = "PumpXBT is watching Pump.fun. Send one token mint or $TICKER for a verified market read.";

  try {
    grounding = await buildPumpXbtReply(rawText);
  } catch (error) {
    console.warn("pumpxbt.grounding_fallback", {
      reason: error instanceof Error ? error.message : String(error)
    });
  }

  const prompt = buildReplyPrompt(rawText, grounding, context);

  try {
    if (config.llmProvider === "claude") {
      return await generateReplyWithClaude(prompt);
    }

    return await generateReplyWithOpenAI(prompt);
  } catch (error) {
    return fallbackReply(grounding, error);
  }
}
