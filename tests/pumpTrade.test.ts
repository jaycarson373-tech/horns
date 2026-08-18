import assert from "node:assert/strict";
import test from "node:test";

import { calculateTradeAmountSol } from "../lib/pumpTrade";

test("sizes trades at one percent of wallet balance", () => {
  const result = calculateTradeAmountSol({ walletLamports: 10_000_000_000, balancePercent: 1, minimumSol: 0.02, reserveSol: 0.01 });
  assert.equal(result.amountSol, 0.1);
});

test("enforces the minimum trade while preserving a fee reserve", () => {
  const result = calculateTradeAmountSol({ walletLamports: 1_000_000_000, balancePercent: 1, minimumSol: 0.02, reserveSol: 0.01 });
  assert.equal(result.amountSol, 0.02);
  assert.throws(
    () => calculateTradeAmountSol({ walletLamports: 25_000_000, balancePercent: 1, minimumSol: 0.02, reserveSol: 0.01 }),
    /minimum order and fee reserve/
  );
});
