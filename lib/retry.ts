import { setTimeout as sleep } from "node:timers/promises";

export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableError";
  }
}

export class RetryableHttpError extends Error {
  status: number;
  body: string;

  constructor(service: string, status: number, body: string) {
    super(`${service} returned ${status}: ${body}`);
    this.name = "RetryableHttpError";
    this.status = status;
    this.body = body;
  }
}

export class NonRetryableHttpError extends NonRetryableError {
  status: number;
  body: string;

  constructor(service: string, status: number, body: string) {
    super(`${service} returned ${status}: ${body}`);
    this.name = "NonRetryableHttpError";
    this.status = status;
    this.body = body;
  }
}

export type RetryOptions = {
  attempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
};

export async function responseText(response: Response) {
  try {
    return await response.text();
  } catch {
    return response.statusText;
  }
}

export function httpError(service: string, status: number, body: string) {
  if (status === 429 || status >= 500) {
    return new RetryableHttpError(service, status, body);
  }

  return new NonRetryableHttpError(service, status, body);
}

export async function throwForBadResponse(service: string, response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  throw httpError(service, response.status, await responseText(response));
}

function isRetryable(error: unknown) {
  if (error instanceof NonRetryableError) {
    return false;
  }

  return true;
}

export async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 8000;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= attempts || !isRetryable(error)) {
        throw error;
      }

      const baseDelay = Math.min(maxDelayMs, initialDelayMs * 2 ** (attempt - 1));
      const jitter = Math.floor(Math.random() * 250);
      console.warn(`${label} failed; retrying in ${baseDelay + jitter}ms`, error);
      await sleep(baseDelay + jitter);
    }
  }

  throw lastError;
}
