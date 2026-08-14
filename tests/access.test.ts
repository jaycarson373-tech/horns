import assert from "node:assert/strict";
import test from "node:test";

import { formatTokenBalance, validateSolanaAddress } from "../lib/access";

test("validates Solana public keys without accepting arbitrary text", () => {
  assert.equal(validateSolanaAddress("11111111111111111111111111111111"), true);
  assert.equal(validateSolanaAddress("not-a-wallet"), false);
  assert.equal(validateSolanaAddress("1111"), false);
});

test("formats raw holder balances without floating point rounding", () => {
  assert.equal(formatTokenBalance("500000000000", 6), "500000");
  assert.equal(formatTokenBalance("1234500", 6), "1.2345");
  assert.equal(formatTokenBalance("42", 0), "42");
});
