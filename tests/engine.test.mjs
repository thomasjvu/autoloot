import test from "node:test";
import assert from "node:assert/strict";
import { Engine, seed, cents } from "../lib/engine.mjs";
function setup() {
  let time = 100000;
  const e = new Engine(seed(), { now: () => time });
  return { e, advance: (ms) => (time += ms) };
}
const start = (e) => e.start({ productId: "p1", duration: 60 });
const bid = (e, amount = "45", userId = "one", messageId = "m1") =>
  e.bid({ amount, userId, username: userId, messageId });
test("money uses integer cents and rejects ambiguous inputs", () => {
  assert.equal(cents("0.29"), 29);
  for (const x of ["-1", "1.001", "1e3", "NaN", "Infinity", 0, {}, 1000001])
    assert.throws(() => cents(x));
});
test("minimum price, increments, self outbids, duplicate delivery", () => {
  const { e } = setup();
  start(e);
  assert.throws(() => bid(e, "44.99"), /at least/);
  bid(e);
  assert.deepEqual(bid(e), { duplicate: true });
  assert.throws(() => bid(e, "46", "one", "m2"), /already/);
  assert.throws(() => bid(e, "45.99", "two", "m3"), /at least/);
  bid(e, "46", "two", "m4");
  assert.equal(e.state.auction.bidCount, 2);
});
test("late bid extends clock to 10 seconds", () => {
  const { e, advance } = setup();
  start(e);
  advance(55000);
  bid(e);
  assert.equal(e.state.auction.endsAt, 165000);
  advance(6000);
  bid(e, "46", "two", "m2");
  assert.equal(e.state.auction.endsAt, 171000);
});
test("fixed ending does not extend", () => {
  const { e, advance } = setup();
  e.start({ productId: "p1", antiSnipe: false });
  advance(59000);
  bid(e);
  assert.equal(e.state.auction.endsAt, 160000);
});
test("bid exactly at deadline is rejected, auction closes once", () => {
  const { e, advance } = setup();
  start(e);
  bid(e);
  advance(60000);
  assert.throws(() => bid(e, "46", "two", "m2"), /no live/);
  e.tick();
  e.tick();
  assert.equal(e.state.orders.length, 1);
  assert.equal(e.state.products[0].quantity, 1);
  assert.equal(e.state.auction.status, "sold");
});
test("pause freezes time and rejects bids; resume restores remaining", () => {
  const { e, advance } = setup();
  start(e);
  advance(20000);
  e.pause();
  assert.equal(e.state.auction.remaining, 40000);
  advance(100000);
  e.tick();
  assert.throws(() => bid(e), /no live/);
  e.resume();
  assert.equal(e.state.auction.endsAt, 260000);
  bid(e);
});
test("cannot pause an expired auction", () => {
  const { e, advance } = setup();
  start(e);
  advance(61000);
  assert.throws(() => e.pause(), /No live/);
  assert.equal(e.state.auction.status, "unsold");
});
test("cancellation creates no order or stock change", () => {
  const { e } = setup();
  start(e);
  bid(e);
  e.finish(true);
  assert.equal(e.state.products[0].quantity, 2);
  assert.equal(e.state.orders.length, 0);
});
test("no bid close is unsold", () => {
  const { e } = setup();
  start(e);
  e.finish();
  assert.equal(e.state.auction.status, "unsold");
  assert.equal(e.state.orders.length, 0);
});
test("live bids require a verified registered identity", () => {
  const { e } = setup();
  e.setMode("live");
  start(e);
  assert.throws(() => bid(e), /verified/);
  assert.throws(
    () =>
      e.bid({ userId: "one", username: "one", source: "twitch", amount: "45" }),
    /Register/,
  );
  e.register({ id: "one", login: "one" });
  e.bid({ userId: "one", username: "one", source: "twitch", amount: "45" });
  e.finish();
  assert.equal(e.state.orders[0].mode, "live");
  assert.throws(() => e.orderUpdate(e.state.orders[0].id, "test-pay"), /demo/);
});
test("cannot switch modes, overlap auctions, or remove active item", () => {
  const { e } = setup();
  start(e);
  assert.throws(() => e.setMode("live"), /Finish/);
  assert.throws(() => start(e), /Finish/);
  assert.throws(() => e.removeProduct("p1"), /Finish/);
});
test("pending order cancellation restores inventory exactly once", () => {
  const { e } = setup();
  start(e);
  bid(e);
  e.finish();
  const o = e.state.orders[0];
  e.orderUpdate(o.id, "cancel");
  assert.equal(e.state.products[0].quantity, 2);
  assert.throws(() => e.orderUpdate(o.id, "cancel"));
  assert.equal(e.state.products[0].quantity, 2);
});
test("payment precedes shipping, paid orders cannot be silently cancelled", () => {
  const { e } = setup();
  start(e);
  bid(e);
  e.finish();
  const o = e.state.orders[0];
  assert.throws(() => e.orderUpdate(o.id, "ship", "x"), /payment/);
  e.orderUpdate(o.id, "test-pay");
  assert.throws(() => e.orderUpdate(o.id, "cancel"), /Refund/);
  assert.throws(() => e.orderUpdate(o.id, "ship", ""), /tracking/);
  e.orderUpdate(o.id, "ship", "USPS 123");
  assert.equal(o.status, "shipped");
});
test("out-of-stock cannot run, inputs are validated", () => {
  const { e } = setup();
  e.state.products[0].quantity = 0;
  assert.throws(() => start(e), /stock/);
  assert.throws(() => e.addProduct({ title: "Hi", price: "1", quantity: -1 }));
  assert.throws(() => e.start({ productId: "p2", duration: 1 }));
});
test("inventory edits validate prices and cannot alter a running auction", () => {
  const { e } = setup();
  e.editProduct("p1", {
    title: "New title",
    description: "Hello",
    quantity: 3,
    price: "49.99",
    image: "/media/abc.png",
  });
  assert.equal(e.state.products[0].price, 4999);
  assert.equal(e.state.products[0].image, "/media/abc.png");
  start(e);
  assert.throws(
    () => e.editProduct("p1", { title: "Bad", quantity: 1, price: "1" }),
    /Finish/,
  );
  assert.equal(e.state.auction.product.title, "New title");
});
