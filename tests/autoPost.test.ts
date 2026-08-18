import assert from "node:assert/strict";
import test from "node:test";

import { buildSignalPost, buildTradePost, buildTreasuryPost } from "../lib/autoPost";

test("verified auto-post templates fit X and avoid fabricated values", () => {
  const signal = buildSignalPost({
    token_mint: "9nXSvn8bUmboPdgA4qnmtzxQdgjXWquK6sYaCFLRgPs1",
    confidence: 91,
    thesis: "Wallet concentration improving while volume accelerates.",
    token: { symbol: "onkey" }
  });
  const trade = buildTradePost({
    token_mint: "ApZuxdpzMrbEYTGEzeY9afh5pj9d6qPRJCTgQYiipbKg",
    token_symbol: "CYBERLEEK",
    sol_amount: 0.1,
    tx_signature: "verified-signature"
  });
  const burn = buildTreasuryPost({
    event_type: "burn",
    token: "PUMPXBT",
    amount: 1250,
    amount_usd: null,
    signature: "verified-signature"
  });

  for (const post of [signal, trade, burn]) {
    assert.ok(post.length <= 280);
    assert.equal(post.includes("undefined"), false);
    assert.equal(post.includes("NaN"), false);
  }
  assert.match(signal, /\$ONKEY/);
  assert.match(trade, /Position opened: 0.1 SOL/);
  assert.doesNotMatch(burn, /\$[0-9]/);
});
