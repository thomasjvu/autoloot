import test from "node:test";
import assert from "node:assert/strict";
import { Engine, seed } from "../lib/engine.mjs";
import { publicVote } from "../lib/voting.mjs";
function setup() {
  let now = 1000;
  const e = new Engine(seed(), { now: () => now });
  return { e, advance: (ms) => (now += ms) };
}
test("vote counts one ballot per account and permits changing it", () => {
  const { e } = setup();
  e.openVote({ productIds: ["p1", "p2", "p3"] });
  e.vote({ userId: "a", option: 1 });
  e.vote({ userId: "a", option: 1 });
  assert.deepEqual(e.state.vote.counts, [1, 0, 0]);
  e.vote({ userId: "a", option: 3 });
  assert.deepEqual(e.state.vote.counts, [0, 0, 1]);
  assert.equal(publicVote(e.state.vote).voters, 1);
  assert.equal(publicVote(e.state.vote).ballots, undefined);
});
test("deadline closes vote and ties select the earliest option without starting auction", () => {
  const { e, advance } = setup();
  e.openVote({ productIds: ["p2", "p1"], duration: 10 });
  e.vote({ userId: "a", option: 2 });
  e.vote({ userId: "b", option: 1 });
  advance(10000);
  assert.throws(() => e.vote({ userId: "c", option: 2 }), /closed/);
  assert.equal(e.state.vote.winner, "p2");
  assert.equal(e.state.auction, null);
});
test("no votes has no winner and cancellation never selects one", () => {
  const { e } = setup();
  e.openVote({ productIds: ["p1", "p2"] });
  e.closeVote();
  assert.equal(e.state.vote.winner, null);
  e.openVote({ productIds: ["p1", "p2"] });
  e.vote({ userId: "a", option: 1 });
  e.closeVote(true);
  assert.equal(e.state.vote.status, "cancelled");
  assert.equal(e.state.vote.winner, null);
});
test("live voting accepts Twitch identities without purchase registration", () => {
  const { e } = setup();
  e.setMode("live");
  e.openVote({ productIds: ["p1", "p2"] });
  assert.throws(() => e.vote({ userId: "a", option: 1 }), /Twitch/);
  e.vote({ userId: "a", option: 1, source: "twitch" });
  assert.equal(e.state.vote.counts[0], 1);
  assert.throws(() => e.setMode("demo"), /vote/);
});
test("vote validates products, state, timing, blocked accounts and option range", () => {
  const { e } = setup();
  assert.throws(() => e.openVote({ productIds: ["p1", "p1"] }));
  assert.throws(() => e.openVote({ productIds: ["p1"] }));
  assert.throws(() => e.openVote({ productIds: ["p1", "p2"], duration: 2 }));
  e.start({ productId: "p1" });
  assert.throws(
    () => e.openVote({ productIds: ["p1", "p2"] }),
    /current auction/,
  );
  e.openVote({ productIds: ["p2", "p3"] });
  assert.throws(() => e.openVote({ productIds: ["p2", "p3"] }), /Finish/);
  assert.throws(() => e.vote({ userId: "a", option: 4 }));
  e.state.blocked.push({ userId: "a" });
  assert.throws(() => e.vote({ userId: "a", option: 1 }), /disabled/);
});
test("vote state survives serialization and ballots never leak publicly", () => {
  const { e } = setup();
  e.openVote({ productIds: ["p1", "p2"] });
  e.vote({ userId: "secret-account-id", option: 2 });
  const restored = new Engine(JSON.parse(JSON.stringify(e.state)));
  assert.equal(restored.state.vote.counts[1], 1);
  assert.equal(
    JSON.stringify(publicVote(restored.state.vote)).includes(
      "secret-account-id",
    ),
    false,
  );
});
