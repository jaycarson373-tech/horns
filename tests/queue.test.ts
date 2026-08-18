import assert from "node:assert/strict";
import test from "node:test";

import { isRetryableProcessedMention } from "../lib/queue";

test("retries dry-run mentions after the worker goes live", () => {
  assert.equal(isRetryableProcessedMention("dry_run", null, false), true);
  assert.equal(isRetryableProcessedMention("dry_run", null, true), false);
});

test("retries failures and rate limits without replaying completed mentions", () => {
  assert.equal(isRetryableProcessedMention("failed", "temporary failure", false), true);
  assert.equal(isRetryableProcessedMention("skipped", "user_rate_limited", false), true);
  assert.equal(isRetryableProcessedMention("replied", null, false), false);
});
