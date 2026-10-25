import test from "node:test";
import assert from "node:assert/strict";
import { Engine, seed } from "../lib/engine.mjs";
import { Twitch } from "../lib/twitch.mjs";
function setup() {
  const e = new Engine(seed());
  e.setMode("live");
  e.start({ productId: "p1" });
  const t = new Twitch(e);
  t.user = { id: "channel", login: "creator" };
  const messages = [];
  t.send = async (text) => messages.push(text);
  const event = (text) => ({
    broadcaster_user_id: "channel",
    chatter_user_id: "viewer",
    chatter_user_name: "viewer",
    chatter_user_login: "viewer",
    message_id: "message",
    message: { text },
  });
  return { e, t, messages, event };
}
test("Twitch bids require registration and parse explicit bid command only", async () => {
  const { e, t, messages, event } = setup();
  await t.onChat(event("!bid 45"));
  assert.equal(e.state.auction.bidCount, 0);
  assert.match(messages[0], /Register/);
  e.register({ id: "viewer", login: "viewer" });
  await t.onChat(event("I would pay $100"));
  assert.equal(e.state.auction.bidCount, 0);
  await t.onChat(event("!bid $45.00"));
  assert.equal(e.state.auction.highest.amount, 4500);
  await t.onChat(event("!bid $45.00"));
  assert.equal(e.state.auction.bidCount, 1);
});
test("shared chat and unrelated channel events cannot place bids", async () => {
  const { e, t, event } = setup();
  e.register({ id: "viewer", login: "viewer" });
  await t.onChat({ ...event("!bid 45"), broadcaster_user_id: "other" });
  await t.onChat({ ...event("!bid 45"), source_broadcaster_user_id: "other" });
  assert.equal(e.state.auction.bidCount, 0);
  assert.equal(e.state.chat.length, 0);
});
test("invalid bid forms explain syntax, demo mode never accepts Twitch bids", async () => {
  const { e, t, event, messages } = setup();
  await t.onChat(event("!bid one hundred"));
  assert.match(messages[0], /Use !bid/);
  e.finish(true);
  e.setMode("demo");
  e.start({ productId: "p1" });
  await t.onChat(event("!bid 45"));
  assert.equal(e.state.auction.bidCount, 0);
});
test("chat voting uses verified event identity and does not create bids", async () => {
  const { e, t, event } = setup();
  e.openVote({ productIds: ["p2", "p3"] });
  await t.onChat(event("!vote 2"));
  assert.equal(e.state.vote.counts[1], 1);
  await t.onChat({ ...event("!vote 1"), message_id: "second" });
  assert.deepEqual(e.state.vote.counts, [1, 0]);
  assert.equal(e.state.auction.bidCount, 0);
});
