import test from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { Engine, seed } from "../lib/engine.mjs";
import { Payments } from "../lib/payments.mjs";
function fixture() {
  const e = new Engine(seed());
  e.setMode("live");
  e.register({ id: "buyer", login: "buyer" });
  const order = e.buyNow({
    productId: "p4",
    userId: "buyer",
    username: "buyer",
    requestId: "request",
  });
  return { e, order };
}
function session(o, extra = {}) {
  return {
    id: "cs_fixture",
    client_reference_id: o.id,
    metadata: { orderId: o.id },
    currency: "usd",
    amount_total: o.total,
    livemode: false,
    payment_status: "paid",
    status: "complete",
    payment_intent: "pi_fixture",
    collected_information: {
      shipping_details: {
        name: "Test Buyer",
        address: {
          line1: "123 Test St",
          city: "Test City",
          postal_code: "10001",
          country: "US",
        },
      },
    },
    ...extra,
  };
}
function client(o) {
  const verifier = new Stripe("not-a-real-key").webhooks;
  const c = {
    webhooks: verifier,
    checkout: {
      sessions: {
        create: async (args) => {
          c.args = args;
          c.creates++;
          return session(o, {
            status: "open",
            payment_status: "unpaid",
            url: "https://checkout.stripe.com/test",
            expires_at: Math.floor(Date.now() / 1000) + 1800,
          });
        },
        retrieve: async () =>
          session(o, {
            status: "open",
            payment_status: "unpaid",
            url: "https://checkout.stripe.com/test",
          }),
        expire: async () =>
          session(o, { status: "expired", payment_status: "unpaid" }),
      },
    },
    refunds: {
      create: async () => ({ id: "re_fixture", status: "succeeded" }),
      retrieve: async () => ({ id: "re_fixture", status: "succeeded" }),
    },
    creates: 0,
  };
  return c;
}
test("buy now reserves stock once and retries return the same order", () => {
  const { e, order } = fixture();
  const again = e.buyNow({
    productId: "p4",
    userId: "buyer",
    username: "buyer",
    requestId: "request",
  });
  assert.equal(again.id, order.id);
  assert.equal(e.product("p4").quantity, 2);
  assert.equal(order.amount, 1800);
  assert.equal(e.state.orders.length, 1);
});
test("buy now rejects unlisted, sold out, active-auction and blocked products", () => {
  const { e } = fixture();
  assert.throws(
    () =>
      e.buyNow({
        productId: "p1",
        userId: "buyer",
        username: "buyer",
        requestId: "two",
      }),
    /not available/,
  );
  e.start({ productId: "p4" });
  assert.throws(
    () =>
      e.buyNow({
        productId: "p4",
        userId: "buyer",
        username: "buyer",
        requestId: "two",
      }),
    /auction block/,
  );
  e.finish(true);
  e.block("buyer", true);
  assert.throws(
    () =>
      e.buyNow({
        productId: "p4",
        userId: "buyer",
        username: "buyer",
        requestId: "two",
      }),
    /disabled/,
  );
});
test("shipping snapshots do not change when the show price changes", () => {
  const { e, order } = fixture();
  e.state.show.shippingPrice = 1000;
  assert.equal(order.total, 1800);
  const n = e.buyNow({
    productId: "p4",
    userId: "buyer",
    username: "buyer",
    requestId: "second",
  });
  assert.equal(n.total, 2800);
});
test("invalid shipping does not modify private address", () => {
  const { e, order } = fixture();
  assert.throws(() => e.shipping(order.id, { name: "B" }), /required/);
  assert.equal(order.shipping, undefined);
  e.shipping(order.id, {
    name: "B",
    line1: "123 Test",
    city: "Test",
    postal_code: "12345",
    country: "US",
  });
  assert.equal(order.shipping.city, "Test");
});
test("payment fulfillment checks identity, amount, currency, environment and idempotency", () => {
  const { e, order } = fixture();
  e.attachCheckout(order.id, {
    id: "cs_fixture",
    url: "https://checkout.stripe.com/test",
    expires_at: 99999999,
  });
  order.paymentLive = false;
  for (const change of [
    { id: "other" },
    { client_reference_id: "other" },
    { amount_total: 1 },
    { currency: "eur" },
    { livemode: true },
  ])
    assert.throws(() =>
      e.paymentEvent(
        "invalid",
        "checkout.session.completed",
        session(order, change),
      ),
    );
  e.paymentEvent("evt_1", "checkout.session.completed", session(order));
  assert.equal(order.status, "paid");
  assert.equal(order.shipping.name, "Test Buyer");
  assert.deepEqual(
    e.paymentEvent("evt_1", "checkout.session.completed", session(order)),
    { duplicate: true },
  );
  assert.equal(e.product("p4").quantity, 2);
  e.paymentEvent("evt_expired", "checkout.session.expired", session(order));
  assert.equal(order.status, "paid");
  assert.equal(e.product("p4").quantity, 2);
});
test("async checkout waits for actual payment, failure releases stock once", () => {
  const { e, order } = fixture();
  e.attachCheckout(order.id, {
    id: "cs_fixture",
    url: "x",
    expires_at: 99999999,
  });
  e.paymentEvent(
    "evt_1",
    "checkout.session.completed",
    session(order, { payment_status: "unpaid" }),
  );
  assert.equal(order.status, "processing");
  e.paymentEvent(
    "evt_2",
    "checkout.session.async_payment_failed",
    session(order, { payment_status: "unpaid" }),
  );
  assert.equal(order.status, "expired");
  assert.equal(e.product("p4").quantity, 3);
  e.paymentEvent("evt_3", "checkout.session.expired", session(order));
  assert.equal(e.product("p4").quantity, 3);
});
test("cannot manually cancel an active checkout or ship an unpaid order", () => {
  const { e, order } = fixture();
  e.attachCheckout(order.id, {
    id: "cs_fixture",
    url: "x",
    expires_at: 99999999,
  });
  assert.throws(() => e.orderUpdate(order.id, "cancel"), /Expire/);
  assert.throws(() => e.orderUpdate(order.id, "ship", "ref"), /payment/);
});
test("checkout uses server prices, collects shipping and reuses an open session", async () => {
  const { e, order } = fixture();
  const c = client(order),
    p = new Payments(e, { client: c, secret: "whsec_fixture" });
  const result = await p.checkout(order.id);
  assert.match(result.url, /checkout.stripe.com/);
  assert.equal(c.args.line_items[0].price_data.unit_amount, order.amount);
  assert.equal(c.args.client_reference_id, order.id);
  assert.equal(c.args.payment_method_types, undefined);
  assert.match(c.args.integration_identifier, /^autoloot_[a-z]{8}$/);
  assert.deepEqual(c.args.shipping_address_collection.allowed_countries, [
    "US",
  ]);
  await p.checkout(order.id);
  assert.equal(c.creates, 1);
});
test("raw signed Stripe webhook fulfills and rejects tampered payloads", async () => {
  const { e, order } = fixture();
  const c = client(order),
    p = new Payments(e, { client: c, secret: "whsec_fixture" });
  await p.checkout(order.id);
  const raw = JSON.stringify({
    id: "evt_signed",
    type: "checkout.session.completed",
    data: { object: session(order) },
  });
  const header = c.webhooks.generateTestHeaderString({
    payload: raw,
    secret: "whsec_fixture",
  });
  assert.throws(() => p.webhook(raw + " ", header), /signature/);
  p.webhook(raw, header);
  assert.equal(order.status, "paid");
  assert.equal(e.state.processedPayments.length, 1);
  p.webhook(raw, header);
  assert.equal(e.state.processedPayments.length, 1);
});
test("cancel expires a payable session before releasing stock", async () => {
  const { e, order } = fixture();
  const c = client(order),
    p = new Payments(e, { client: c, secret: "whsec_fixture" });
  await p.checkout(order.id);
  await p.cancel(order.id);
  assert.equal(order.status, "cancelled");
  assert.equal(e.product("p4").quantity, 3);
});
test("cancel cannot override a payment that won the race", async () => {
  const { e, order } = fixture();
  const c = client(order),
    p = new Payments(e, { client: c, secret: "whsec_fixture" });
  await p.checkout(order.id);
  c.checkout.sessions.retrieve = async () => session(order);
  await assert.rejects(() => p.cancel(order.id), /Payment completed/);
  assert.equal(order.status, "paid");
  assert.equal(e.product("p4").quantity, 2);
});
test("full refund restores stock exactly once and rejects already fulfilled orders", async () => {
  const { e, order } = fixture();
  const c = client(order),
    p = new Payments(e, { client: c, secret: "whsec_fixture" });
  const stock=e.product('p4').quantity;
  assert.throws(()=>e.editProduct('p4',{...e.product('p4'),price:'12',fulfillment:{type:'nft',chain:'eip155:8453',sender:'0x'+'1'.repeat(40),contract:'0x'+'2'.repeat(40),tokenId:'1'}}),/allocated orders/);
  assert.equal(e.product('p4').quantity,stock);
  await p.checkout(order.id);
  e.paymentEvent("payment", "checkout.session.completed", session(order));
  await p.refund(order.id);
  assert.equal(order.status, "refunded");
  assert.equal(e.product("p4").quantity, 3);
  const shipped=fixture(),shippedClient=client(shipped.order),shippedPayments=new Payments(shipped.e,{client:shippedClient,secret:'fixture'});
  await shippedPayments.checkout(shipped.order.id);
  shipped.e.paymentEvent('shipped-payment','checkout.session.completed',session(shipped.order));
  shipped.e.orderUpdate(shipped.order.id,'ship','tracking');
  await assert.rejects(shippedPayments.refund(shipped.order.id),/unshipped/);

  e.markRefunded(order.id,order.refundId);
  assert.equal(e.product("p4").quantity,3);
  await assert.rejects(p.refund(order.id),/unshipped/);
  assert.throws(()=>e.orderUpdate(order.id,'ship','tracking'),/refund/);
});
test("voiding bids requires pause and preserves an auditable record", () => {
  const e = new Engine(seed());
  e.start({ productId: "p1" });
  e.bid({ userId: "a", username: "a", amount: "45" });
  e.bid({ userId: "b", username: "b", amount: "46" });
  assert.throws(() => e.voidBid(), /Pause/);
  e.pause();
  e.voidBid();
  assert.equal(e.state.auction.highest.username, "a");
  assert.equal(e.state.bids[0].voided, true);
  assert.equal(e.state.auction.bidCount, 1);
});

test('untouched reservations expire at the exact deadline and release stock once', () => {
  const { e, order } = fixture();
  e.now = () => order.reservationExpiresAt - 1;
  e.tick();
  assert.equal(order.status, 'pending');
  assert.equal(e.product('p4').quantity, 2);
  e.now = () => order.reservationExpiresAt;
  e.tick();
  assert.equal(order.status, 'expired');
  assert.equal(order.expiryReason, 'reservation-timeout');
  assert.equal(e.product('p4').quantity, 3);
  e.tick();
  assert.equal(e.product('p4').quantity, 3);
  assert.throws(() => e.orderUpdate(order.id, 'confirm-paid'), /Only pending/);
  assert.throws(() => e.orderUpdate(order.id, 'cancel'), /cannot be cancelled/);
});
test('checkout cannot start after the reservation deadline even before the timer ticks', async () => {
  const { e, order } = fixture();
  e.now = () => order.reservationExpiresAt;
  const c = client(order);
  const payments = new Payments(e, { client: c, secret: 'fixture' });
  await assert.rejects(payments.checkout(order.id), /not awaiting payment/);
  assert.equal(c.creates, 0);
  assert.equal(e.product('p4').quantity, 3);
});
test('checkout creation in flight keeps stock reserved beyond the local deadline', async () => {
  const { e, order } = fixture();
  const c = client(order);
  let complete;
  c.checkout.sessions.create = () => new Promise(resolve => { complete = resolve; });
  const payments = new Payments(e, { client: c, secret: 'fixture' });
  const pending = payments.checkout(order.id);
  await Promise.resolve();
  assert.ok(order.checkoutCreated);
  e.now = () => order.reservationExpiresAt + 1;
  e.tick();
  assert.equal(order.status, 'pending');
  assert.equal(e.product('p4').quantity, 2);
  complete(session(order, {status:'open',payment_status:'unpaid',url:'https://checkout.stripe.com/test',expires_at:Math.floor(Date.now()/1000)+1800}));
  await pending;
  e.tick();
  assert.equal(order.status, 'pending');
  e.paymentEvent('paid-after-reservation', 'checkout.session.completed', session(order));
  assert.equal(order.status, 'paid');
  assert.equal(e.product('p4').quantity, 2);
});
test('ambiguous Stripe failures cannot be cancelled or expired locally and recover idempotently', async () => {
  const { e, order } = fixture();
  const c = client(order);
  const create = c.checkout.sessions.create;
  const keys = [];
  c.checkout.sessions.create = async (args, options) => { keys.push(options.idempotencyKey); throw Error('Response lost'); };
  const payments = new Payments(e, { client:c, secret:'fixture' });
  await assert.rejects(payments.checkout(order.id), /Response lost/);
  e.now = () => order.reservationExpiresAt + 1;
  e.tick();
  assert.equal(order.status, 'pending');
  await assert.rejects(payments.cancel(order.id), /outcome is unknown/);
  assert.throws(() => e.orderUpdate(order.id, 'confirm-paid'), /reconcile/);
  c.checkout.sessions.create = async (args, options) => { keys.push(options.idempotencyKey); return create(args); };
  await payments.checkout(order.id);
  assert.equal(keys[0], keys[1]);
  assert.equal(order.checkoutId, 'cs_fixture');
  assert.equal(e.product('p4').quantity, 2);
});
test('persisted reservations expire safely after restart', () => {
  const { e, order } = fixture();
  const saved = JSON.parse(JSON.stringify(e.state));
  const restored = new Engine(saved, { now: () => order.createdAt + 16 * 60 * 1000 });
  assert.equal(restored.order(order.id).status, 'expired');
  assert.equal(restored.product('p4').quantity, 3);
  const again = new Engine(JSON.parse(JSON.stringify(restored.state)));
  again.tick();
  assert.equal(again.product('p4').quantity, 3);
});
test('auction winner reservations expire while paid orders retain their stock allocation', () => {
  const { e, order } = fixture();
  e.orderUpdate(order.id, 'confirm-paid');
  e.start({productId:'p1'});
  e.bid({userId:'buyer',username:'buyer',amount:'45',source:'twitch'});
  e.finish();
  const winner = e.state.orders[0];
  assert.equal(winner.kind, 'auction');
  e.now = () => winner.reservationExpiresAt;
  e.tick();
  assert.equal(winner.status, 'expired');
  assert.equal(e.product('p1').quantity, 2);
  assert.equal(order.status, 'paid-external');
  assert.equal(e.product('p4').quantity, 2);
});
test('retrying an expired purchase request returns its original order without another reservation', () => {
  const { e, order } = fixture();
  e.now = () => order.reservationExpiresAt;
  const retry = e.buyNow({productId:'p4',userId:'buyer',username:'buyer',requestId:'request'});
  assert.equal(retry.id, order.id);
  assert.equal(retry.status, 'expired');
  assert.equal(e.product('p4').quantity, 3);
  assert.equal(e.state.orders.length, 1);
});
test('provider-confirmed checkout expiry can reconcile a held order after the local deadline', async () => {
  const { e, order } = fixture();
  const c = client(order);
  const payments = new Payments(e, {client:c,secret:'fixture'});
  await payments.checkout(order.id);
  e.now = () => order.reservationExpiresAt + 1;
  c.checkout.sessions.retrieve = async () => session(order,{status:'expired',payment_status:'unpaid'});
  await assert.rejects(payments.checkout(order.id), /checkout has expired/);
  e.tick();
  assert.equal(order.status, 'expired');
  assert.equal(e.product('p4').quantity, 3);
});
test('cancelling a provider-confirmed expired session after the reservation deadline releases stock once', async () => {
  const { e, order } = fixture();
  const c = client(order);
  const payments = new Payments(e, {client:c,secret:'fixture'});
  await payments.checkout(order.id);
  e.now = () => order.reservationExpiresAt + 1;
  await payments.cancel(order.id);
  assert.equal(order.status, 'expired');
  e.tick();
  assert.equal(e.product('p4').quantity, 3);
});

test('pending or lost refund responses persist a fulfillment hold through restart',async()=>{
 const {e,order}=fixture(),c=client(order),p=new Payments(e,{client:c,secret:'fixture'});
 await p.checkout(order.id);e.paymentEvent('paid','checkout.session.completed',session(order));
 let rejectRequest;let requested;
 const started=new Promise(resolve=>{requested=resolve;});
 c.refunds.create=()=>{requested();return new Promise((_,reject)=>{rejectRequest=reject;});};
 const attempt=p.refund(order.id);await started;
 assert.ok(order.refundRequestedAt);assert.throws(()=>e.orderUpdate(order.id,'ship','tracking'),/refund/);
 const restored=new Engine(structuredClone(e.state));
 assert.throws(()=>restored.orderUpdate(order.id,'ship','tracking'),/refund/);
 rejectRequest(Error('Response lost'));await assert.rejects(attempt,/lost/);
 assert.equal(order.status,'paid');assert.equal(e.product('p4').quantity,2);
 c.refunds.create=async()=>({id:'re_fixture',status:'succeeded'});
 await p.refund(order.id);assert.equal(order.status,'refunded');assert.equal(e.product('p4').quantity,3);
});
