import assert from "node:assert/strict";
import test from "node:test";

import { parseWalletBuy } from "../lib/tradeWalletSync";

test("parses a confirmed manual wallet buy into the shared trade shape", () => {
  const wallet = "Wallet111111111111111111111111111111111111";
  const parsed = parseWalletBuy({
    signature: "signature",
    timestamp: 1_787_091_000,
    type: "SWAP",
    fee: 5_000,
    accountData: [{ account: wallet, nativeBalanceChange: -20_005_000 }],
    tokenTransfers: [{ toUserAccount: wallet, mint: "Mint", tokenAmount: 123, rawTokenAmount: { decimals: 6 } }]
  }, wallet);
  assert.equal(parsed?.solAmount, 0.02);
  assert.equal(parsed?.tokenAmount, 123);
  assert.equal(parsed?.tokenDecimals, 6);
});

test("ignores failed transactions and sells", () => {
  const wallet = "Wallet111111111111111111111111111111111111";
  assert.equal(parseWalletBuy({ signature: "failed", timestamp: 1, type: "SWAP", transactionError: {} }, wallet), null);
  assert.equal(parseWalletBuy({ signature: "sell", timestamp: 1, type: "SWAP", tokenTransfers: [{ fromUserAccount: wallet, mint: "Mint", tokenAmount: 1 }] }, wallet), null);
});
