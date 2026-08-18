import assert from "node:assert/strict";
import test from "node:test";

import { hasVerifiedPumpMarket } from "../lib/pumpMint";

test("accepts Pump.fun markets without relying on the mint suffix", () => {
  const mint = "STMALKZV8abn6JpxmEDshgVHR8yu2p6xcVut3CbCN7c";
  assert.equal(hasVerifiedPumpMarket(mint, [{ chainId: "solana", dexId: "pumpfun", baseToken: { address: mint } }]), true);
});

test("rejects non-Pump.fun and mismatched markets", () => {
  const mint = "STMALKZV8abn6JpxmEDshgVHR8yu2p6xcVut3CbCN7c";
  assert.equal(hasVerifiedPumpMarket(mint, [{ chainId: "solana", dexId: "raydium", baseToken: { address: mint } }]), false);
  assert.equal(hasVerifiedPumpMarket(mint, [{ chainId: "solana", dexId: "pumpfun", baseToken: { address: "OtherMint" } }]), false);
});
