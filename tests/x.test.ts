import assert from "node:assert/strict";
import test from "node:test";

import { isDirectMention } from "../lib/x";

test("accepts explicit bot mentions in posts and replies", () => {
  assert.equal(isDirectMention("@PumpXBT check this mint", "PumpXBT"), true);
  assert.equal(isDirectMention("thoughts, @pumpxbt?", "@PumpXBT"), true);
});

test("does not trigger on keywords or lookalike handles", () => {
  assert.equal(isDirectMention("PumpXBT check this mint", "PumpXBT"), false);
  assert.equal(isDirectMention("@PumpXBTest check this mint", "PumpXBT"), false);
});
