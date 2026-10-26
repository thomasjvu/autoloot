import { nftAsset, assetKey, isNft } from "./nft.mjs";
import { LEGAL_VERSION, operatorProfile } from "./legal.mjs";
import { runActive, runOwns } from "./runs.mjs";
import { installVoting } from "./voting.mjs";
import { randomUUID } from "node:crypto";
export const physicalFundsVerified = o => o.mode !== 'live' || o.status === 'paid-external' || (['paid','shipped'].includes(o.status) && o.paymentLive === true) || (o.status === 'shipped' && (o.paymentSource === 'external' || (o.paymentLive === undefined && !o.checkoutId && !o.paymentIntent)));
export const RESERVATION_WINDOW_MS = 15 * 60 * 1000;
export const money = (cents) => `$${(cents / 100).toFixed(2)}`;
const fail = (message) => {
  throw new Error(message);
};
export function cents(value) {
  const s = String(value);
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s))
    fail("Enter a positive price with at most two decimals.");
  const n = Math.round(Number(s) * 100);
  if (!Number.isSafeInteger(n) || n < 1 || n > 100000000)
    fail("Price must be between $0.01 and $1,000,000.");
  return n;
}
export function seed() {
  return {
    version: 1,
    mode: "demo",
    blocked: [],
    vote: null,
    processedPayments: [],
    pulls: [],
    orderSequence: 0,
    show: {
      title: "PACK PARTY 001",
      subtitle: "Fresh packs. Big reactions. Your chat in the front row.",
      category: "Pokémon / TCG",
      shippingPrice: 0,
      bidDuration: 60,
      increment: 100,
      antiSnipe: true,
    },
    products: [
      {id:"p1", title:"Charizard ex · 151 #199/165", description:"Scarlet & Violet—151 special illustration rare. Reference card scan for the demo; seller-set practice starting price, not a market valuation. No physical item offered.", category:"Pokémon / singles", art:"card", image:"/demo/charizard.png", price:4500, quantity:2, condition:"Demo · raw scan"},
      {id:"p2", title:"Pikachu · 151 #173/165", description:"Scarlet & Violet—151 illustration rare. Reference card scan for the demo. Practice listing only; no physical item offered or condition established.", category:"Pokémon / singles", art:"card", image:"/demo/pikachu.png", price:3500, quantity:1, condition:"Demo · raw scan"},
      {id:"p3", title:"Pikachu · 151 #173 · PSA 10", description:"Reference slab photo from PokeGrad. Pictured label reads PSA GEM MT 10, cert 104011591. Demo only: not seller-owned stock, independent certification verification, or a market valuation. No physical item offered.", category:"Pokémon / slabs", art:"card", image:"/demo/pikachu-slab.jpg", price:2500, quantity:1, condition:"Demo · PSA 10 photo"},
      {id:"p4", title:"Mew ex · 151 #205/165", description:"Scarlet & Violet—151 hyper rare. Reference card scan for the demo. Seller-set practice prices; no physical item offered or condition established.", category:"Pokémon / singles", art:"card", image:"/demo/mew.png", price:1200, buyNowPrice:1800, listed:true, quantity:3, condition:"Demo · raw scan"},
    ],
    auction: null,
    history: [],
    orders: [],
    bids: [],
    chat: [],
    activity: [],
    registrations: [],
    companion: {
      enabled: true,
      overlayVoice: false,
      reducedMotion: false,
      voice: false,
      provider: "demo",
      name: "Munny",
      message: "Pack party ready! Queue a booster auction or open Rip studio and show me your next pull.",
      mood: "happy",
    },
  };
}
export class Engine {
  constructor(
    state = seed(),
    { now = () => Date.now(), save = () => {}, onChange = () => {} } = {},
  ) {
    this.state = state;
    if (!Number.isSafeInteger(state.orderSequence) || state.orderSequence < 0)
      fail("Workspace is missing its order sequence.");
    for (const order of state.orders)
      if (order.status === "pending" && !Number.isFinite(order.reservationExpiresAt))
        fail("Pending order is missing its persisted reservation deadline.");
    this.lastCommitted = structuredClone(state);
    this.halted = false;
    this.now = now;
    this.save = save;
    this.onChange = onChange;
  }
  commit() {
    if (this.halted) fail("Backend halted; operator recovery required.");
    try { this.save(this.state); }
    catch(error) { this.state = structuredClone(this.lastCommitted); this.halted = true; throw error; }
    this.lastCommitted = structuredClone(this.state);
    this.onChange(this.state);
  }
  nextOrderNumber() {
    this.state.orderSequence++;
    return `AL-${String(this.state.orderSequence).padStart(4, "0")}`;
  }
  activity(text, type = "info") {
    this.state.activity.unshift({
      id: randomUUID(),
      at: this.now(),
      text,
      type,
    });
    this.state.activity = this.state.activity.slice(0, 200);
  }
  say(message, mood = "happy") {
    Object.assign(this.state.companion, {
      message,
      mood,
      eventId: randomUUID(),
      at: this.now(),
    });
  }
  product(id) {
    return (
      this.state.products.find((p) => p.id === id) || fail("Product not found.")
    );
  }
  validateSku(input, id) {
    const sku=String(input.sku || "").trim();
    if(sku.length>100) fail("SKU must fit within 100 characters.");
    if(sku && this.state.products.some(p=>p.id!==id && p.sku===sku)) fail("SKU already exists.");
    return sku;
  }
  addProduct(input) {
    const sku=this.validateSku(input);
    const title = String(input.title || "")
      .trim()
      .slice(0, 100);
    if (!title) fail("A product title is required.");
    const quantity = Number(input.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000)
      fail("Quantity must be 1–10,000.");
    const fulfillment = nftAsset(input.fulfillment);
    if (fulfillment.type==='nft' && this.state.orders.some(o=>assetKey(o.product.fulfillment)===assetKey(fulfillment)&&!['cancelled','expired','refunded'].includes(o.status))) fail('NFT is already allocated to an order.');
    if (fulfillment.type === 'nft' && (quantity !== 1 || this.state.products.some(p => assetKey(p.fulfillment) === assetKey(fulfillment)))) fail('Each NFT must be a unique, single-unit inventory asset.');
    const p = {
      fulfillment,
      sku,
      id: randomUUID(),
      title,
      description: String(input.description || "").slice(0, 1000),
      category: String(input.category || "Collectibles").slice(0, 60),
      price: cents(input.price),
      buyNowPrice: input.buyNowPrice ? cents(input.buyNowPrice) : null,
      listed: Boolean(input.listed),
      quantity,
      condition: String(input.condition || "New").slice(0, 40),
      art: ["pack", "card", "sleeves", "keyboard", "console", "headphones", "mushroom", "box"].includes(
        input.art,
      )
        ? input.art
        : "box",
    };
    if (
      input.image &&
      /^\/media\/[a-f0-9-]+\.(png|jpg|webp)$/.test(input.image)
    )
      p.image = input.image;
    this.state.products.push(p);
    this.activity(`Added ${p.title} to the lineup.`);
    this.commit();
    return p;
  }
  editProduct(id, input) {
    if (runOwns(this.state, id)) fail("Stop the agent run before editing its inventory.");
    const p = this.product(id);
    if (
      this.state.auction?.productId === id &&
      ["live", "paused"].includes(this.state.auction.status)
    )
      fail("Finish this product’s auction before editing it.");
    const title = String(input.title || "")
      .trim()
      .slice(0, 100);
    const quantity = Number(input.quantity);
    if (!title) fail("A product title is required.");
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 10000)
      fail("Quantity must be 0–10,000.");
    const fulfillment = input.fulfillment === undefined ? (p.fulfillment || {type:'physical'}) : nftAsset(input.fulfillment);
    if (assetKey(fulfillment)!==assetKey(p.fulfillment) && this.state.orders.some(o=>o.product.id===id&&!['cancelled','expired','refunded'].includes(o.status))) fail('Resolve allocated orders before changing fulfillment type or asset.');
    if (p.fulfillment?.type === 'nft' && this.state.orders.some(o=>assetKey(o.product.fulfillment)===assetKey(p.fulfillment)&&!['cancelled','expired','refunded'].includes(o.status)) && (quantity > p.quantity || assetKey(fulfillment)!==assetKey(p.fulfillment))) fail('NFT is allocated to an order; reconcile custody before changing its asset or stock.');
    if (fulfillment.type === 'nft' && (quantity > 1 || this.state.products.some(other => other.id !== id && assetKey(other.fulfillment) === assetKey(fulfillment)))) fail('Each NFT must be a unique, single-unit inventory asset.');
    const sku = input.sku === undefined ? (p.sku || "") : this.validateSku(input, id);
    const price = cents(input.price);
    const buyNowPrice = input.buyNowPrice ? cents(input.buyNowPrice) : null;
    Object.assign(p, {
      sku,
      fulfillment,
      title,
      quantity,
      price,
      buyNowPrice,
      listed: Boolean(input.listed),
      description: String(input.description || "").slice(0, 1000),
      category: String(input.category || "Collectibles").slice(0, 60),
      condition: String(input.condition || "New").slice(0, 40),
    });
    if (
      ["pack", "card", "sleeves", "keyboard", "console", "headphones", "mushroom", "box"].includes(
        input.art,
      )
    )
      p.art = input.art;
    if (input.image === "") delete p.image;
    else if (
      input.image &&
      /^\/media\/[a-f0-9-]+\.(png|jpg|webp)$/.test(input.image)
    )
      p.image = input.image;
    this.activity(`Updated ${p.title}.`);
    this.commit();
    return p;
  }
  removeProduct(id) {
    if (runOwns(this.state, id)) fail("Stop the agent run before removing its inventory.");
    if (
      this.state.auction?.productId === id &&
      ["live", "paused"].includes(this.state.auction.status)
    )
      fail("Finish this product’s auction first.");
    this.product(id);
    this.state.products = this.state.products.filter((p) => p.id !== id);
    this.commit();
  }
  start({
    productId,
    runId = null,
    runStep = null,
    duration = this.state.show.bidDuration,
    increment = String(this.state.show.increment / 100),
    antiSnipe = this.state.show.antiSnipe,
  }) {
    if (runActive(this.state.run) && (this.state.run.status !== "running" || this.now() >= this.state.run.expiresAt || runId !== this.state.run.id || runStep !== this.state.run.index || this.state.run.steps[runStep]?.productId !== productId || this.state.run.steps[runStep]?.format !== "auction"))
      fail("Stop the agent run before starting a manual auction.");
    if (
      this.state.auction &&
      ["live", "paused"].includes(this.state.auction.status)
    )
      fail("Finish the current auction first.");
    const p = this.product(productId);
    if(this.state.mode==='live' && (p.practiceOnly))fail('Practice inventory cannot be sold live.');
    if (p.quantity < 1) fail("This product is out of stock.");
    duration = Number(duration);
    if (!Number.isInteger(duration) || duration < 10 || duration > 3600)
      fail("Duration must be 10–3,600 seconds.");
    this.state.auction = {
      id: randomUUID(),
      productId,
      product: structuredClone(p),
      shippingPrice: p.fulfillment?.type === "nft" ? 0 : this.state.show.shippingPrice,
      status: "live",
      startedAt: this.now(),
      endsAt: this.now() + duration * 1000,
      duration,
      increment: cents(increment),
      antiSnipe: Boolean(antiSnipe),
      highest: null,
      bidCount: 0,
      mode: this.state.mode,
      ...(runId ? {runId, runStep} : {}),
    };
    this.state.bids = [];
    this.activity(`Auction started: ${p.title}`, "auction");
    this.say(
      `${p.title} is up! Opening bid is ${money(p.price)}. Type !bid followed by your amount.`,
      "excited",
    );
    this.commit();
    return this.state.auction;
  }
  bid({ userId, username, amount, source = "demo", messageId = randomUUID() }) {
    this.tick();
    const a = this.state.auction;
    if (!a || a.status !== "live")
      fail("There is no live auction accepting bids.");
    if (a.mode === "live" && source !== "twitch")
      fail("Live auctions only accept verified Twitch bids.");
    if (this.state.bids.some((b) => b.messageId === messageId))
      return { duplicate: true };
    if (!userId || !username) fail("A bidder identity is required.");
    if (
      source === "twitch" &&
      !this.state.registrations.some((r) => r.userId === userId)
    )
      fail("Register at the viewer link before bidding.");
    if (this.state.blocked.some((r) => r.userId === userId))
      fail("Bidding is disabled for this account.");
    const price = cents(amount),
      minimum = a.highest ? a.highest.amount + a.increment : a.product.price;
    if (price < minimum) fail(`Next bid must be at least ${money(minimum)}.`);
    if (a.highest?.userId === userId) fail("You already have the highest bid.");
    const b = {
      id: randomUUID(),
      auctionId: a.id,
      userId,
      username: String(username).slice(0, 40),
      amount: price,
      at: this.now(),
      source,
      messageId,
    };
    a.highest = b;
    a.bidCount++;
    this.state.bids.unshift(b);
    this.state.bids = this.state.bids.slice(0, 2000);
    if (a.antiSnipe && a.endsAt - this.now() < 10000) {
      a.endsAt = this.now() + 10000;
      this.activity("Late bid: clock extended to 10 seconds.", "auction");
    }
    this.activity(`${b.username} bid ${money(price)}.`, "bid");
    this.say(
      `${money(price)} from ${b.username}! Current high bid.`,
      "excited",
    );
    this.commit();
    return b;
  }
  pause() {
    const a = this.state.auction;
    this.tick();
    if (a?.status !== "live") fail("No live auction to pause.");
    a.remaining = Math.max(0, a.endsAt - this.now());
    a.status = "paused";
    this.say("Auction paused. Take your time—we’ll be here.", "paused");
    this.activity("Auction paused.");
    this.commit();
  }
  resume() {
    if (this.state.auction?.runId && runActive(this.state.run) && (this.state.run.status !== "running" || this.now() >= this.state.run.expiresAt))
      fail("Resume the agent run before resuming its auction.");
    const a = this.state.auction;
    if (a?.status !== "paused") fail("No paused auction to resume.");
    if (!Number.isSafeInteger(a.shippingPrice) || a.shippingPrice < 0) fail("Auction shipping terms are missing. Cancel this auction and start a new one.");
    a.endsAt = this.now() + a.remaining;
    a.status = "live";
    this.say("We’re back! Bidding is open again.", "excited");
    this.activity("Auction resumed.");
    this.commit();
  }
  finish(cancel = false) {
    const a = this.state.auction;
    if (!a || !["live", "paused"].includes(a.status))
      fail("No active auction.");
    if (!cancel && (!Number.isSafeInteger(a.shippingPrice) || a.shippingPrice < 0))
      fail("Auction shipping terms are missing. Cancel this auction and start a new one.");
    a.status = cancel ? "cancelled" : a.highest ? "sold" : "unsold";
    a.closedAt = this.now();
    if (a.status === "sold") {
      this.product(a.productId).quantity--;
      const order = {
        id: randomUUID(),
        number: this.nextOrderNumber(),
        auctionId: a.id,
        ...(a.runId ? {runId:a.runId, runStep:a.runStep} : {}),
        product: structuredClone(a.product),
        buyer: a.highest.username,
        userId: a.highest.userId,
        amount: a.highest.amount,
        shippingPrice: a.shippingPrice,
        total: a.highest.amount + (a.shippingPrice),
        kind: "auction",
        sellerPolicy: {version:LEGAL_VERSION, ...operatorProfile(this.state.operator)},
        status: "pending",
        mode: a.mode,
        createdAt: this.now(),
        reservationExpiresAt: this.now() + RESERVATION_WINDOW_MS,
        tracking: "",
      };
      this.state.orders.unshift(order);
      this.say(
        `Sold to ${order.buyer} for ${money(order.amount)}! Start checkout within 15 minutes.`,
        "celebrate",
      );
      this.activity(
        `${order.number}: ${order.product.title} sold to ${order.buyer}.`,
        "sale",
      );
    } else {
      this.say(
        cancel
          ? "Auction cancelled. Ready when you are."
          : "No bids. Lot remains in stock.",
        "happy",
      );
      this.activity(`Auction ${a.status}: ${a.product.title}`);
    }
    this.state.history.unshift(structuredClone(a));
    this.commit();
    return a;
  }
  tick() {
    if (this.halted) return;
    this.expireReservations();
    const a=this.state.auction;
    if(a?.status === "live" && (!Number.isSafeInteger(a.shippingPrice) || a.shippingPrice < 0)){
      a.remaining=Math.max(0,a.endsAt-this.now());a.status="paused";
      this.say("Auction shipping terms are missing. Cancel this auction and start a new one.","paused");
      this.activity("Legacy auction paused: review shipping terms and cancel before restarting.","auction");
      this.commit();return;
    }
    if (
      this.state.vote?.status === "open" &&
      this.now() >= this.state.vote.endsAt
    )
      this.closeVote();
    if (
      this.state.auction?.status === "live" &&
      this.now() >= this.state.auction.endsAt
    )
      this.finish();
  }
  chat(username, text, source = "demo") {
    this.state.chat.push({
      id: randomUUID(),
      username: String(username).slice(0, 40),
      text: String(text).slice(0, 500),
      source,
      at: this.now(),
    });
    this.state.chat = this.state.chat.slice(-100);
    this.commit();
  }
  register(user) {
    if (!this.state.registrations.some((r) => r.userId === user.id)) {
      this.state.registrations.push({
        userId: user.id,
        username: user.login,
        at: this.now(),
      });
      this.activity(`${user.login} registered to bid.`);
      this.commit();
    }
  }
  expireReservations() {
    let changed = false;
    for (const o of this.state.orders) {
      // An attempted provider request can have succeeded even if its response was lost.
      if (o.status !== "pending" || o.checkoutId || o.checkoutCreated != null ||
          !Number.isFinite(o.reservationExpiresAt) || this.now() < o.reservationExpiresAt) continue;
      o.status = "expired";
      o.expiredAt = this.now();
      o.expiryReason = "reservation-timeout";
      const product = this.state.products.find(p => p.id === o.product.id);
      if (product) product.quantity++;
      this.activity(`${o.number}: reservation expired before checkout; stock released.`, "order");
      changed = true;
    }
    if (changed) this.commit();
  }
  orderUpdate(id, action, tracking = "") {
    const o = this.order(id);
    if (["test-pay", "confirm-paid", "cancel"].includes(action) && (o.checkoutId || o.checkoutCreated != null))
      fail("Expire or reconcile the active or attempted checkout before changing payment or releasing stock.");
    if (action === "test-pay") {
      if (o.mode !== "demo" || o.status !== "pending")
        fail("Test payment is only available for pending demo orders.");
      o.status = "test-paid";
      o.paidAt = this.now();
    } else if (action === "confirm-paid") {
      if (o.mode !== "live" || o.status !== "pending")
        fail("Only pending live orders can be marked as externally paid.");
      o.status = "paid-external";
      o.paymentSource = "external";
      o.paidAt = this.now();
    } else if (action === "ship") {
      const shipment=o.shipment;
      if(shipment && ['purchasing','unknown','pending','refund-pending'].includes(shipment.status))fail('Reconcile the shipping label before fulfillment.');
      if(shipment?.status==='purchased' && (shipment.test && o.mode!=='demo' || String(tracking).trim()!==`${shipment.rate.carrier} · ${shipment.trackingNumber}`))fail('Use the purchased label tracking for this order.');
      if (o.refundRequestedAt != null) fail("Reconcile the requested refund before fulfillment.");
      if (isNft(o)) fail("NFT orders complete through verified NFT delivery, not shipping.");
      if (!["paid", "test-paid", "paid-external"].includes(o.status))
        fail("Confirm payment before shipping.");
      if (!physicalFundsVerified(o)) fail("A Stripe test or unverified payment cannot fulfill a live physical order.");
      if (!String(tracking).trim()) fail("Enter a tracking reference.");
      if(o.status === "paid-external") o.paymentSource = "external";
      o.status = "shipped";
      o.tracking = String(tracking).trim().slice(0, 150);
    } else if (action === "cancel") {
      if (o.checkoutId)
        fail("Expire the active checkout before cancelling this order.");
      if (!["pending", "test-paid", "paid-external"].includes(o.status))
        fail("This order cannot be cancelled.");
      if (o.status !== "pending")
        fail("Refund paid orders with the payment provider before cancelling.");
      o.status = "cancelled";
      const p = this.state.products.find((p) => p.id === o.product.id);
      if (p) p.quantity++;
    } else fail("Unknown order action.");
    this.activity(`${o.number}: ${o.status}.`, "order");
    this.commit();
    return o;
  }
  order(id) {
    this.expireReservations();
    return (
      this.state.orders.find((o) => o.id === id) || fail("Order not found.")
    );
  }
  buyNow({ productId, userId, username, requestId, mode = this.state.mode }) {
    this.expireReservations();
    if (!userId || !username || !requestId || String(requestId).length > 100)
      fail("A buyer and request ID are required.");
    const existing = this.state.orders.find(
      (o) => o.purchaseKey === `${userId}:${requestId}`,
    );
    if (existing) return existing;
    if (mode !== this.state.mode)
      fail("Show mode changed. Reload before purchasing.");
    if (this.state.blocked.some((r) => r.userId === userId))
      fail("Purchases are disabled for this account.");
    if (
      mode === "live" &&
      !this.state.registrations.some((r) => r.userId === userId)
    )
      fail("Register with Twitch first.");
    if (runOwns(this.state, productId)) {
      const run = this.state.run, step = run.steps[run.index];
      if (run.status !== "running" || this.now() >= run.expiresAt || step?.productId !== productId || step.format !== "buy-now")
        fail("This item is not the active agent-run listing.");
    }
    const p = this.product(productId);
    if(this.state.mode==='live' && (p.practiceOnly))fail('Practice inventory cannot be sold live.');
    if (!p.listed || !p.buyNowPrice)
      fail("This item is not available for direct purchase.");
    if (p.quantity < 1) fail("This item is sold out.");
    if (
      this.state.auction?.productId === productId &&
      ["live", "paused"].includes(this.state.auction.status)
    )
      fail("This item is currently on the auction block.");
    const o = {
      id: randomUUID(),
      number: this.nextOrderNumber(),
      kind: "buy-now",
      sellerPolicy: {version:LEGAL_VERSION, ...operatorProfile(this.state.operator)},
      ...(runOwns(this.state, productId) ? {runId:this.state.run.id, runStep:this.state.run.index} : {}),
      product: structuredClone(p),
      buyer: username,
      userId,
      amount: p.buyNowPrice,
      shippingPrice: p.fulfillment?.type === 'nft' ? 0 : this.state.show.shippingPrice,
      total: p.buyNowPrice + (p.fulfillment?.type === 'nft' ? 0 : this.state.show.shippingPrice),
      status: "pending",
      mode,
      createdAt: this.now(),
      reservationExpiresAt: this.now() + RESERVATION_WINDOW_MS,
      tracking: "",
      purchaseKey: `${userId}:${requestId}`,
    };
    p.quantity--;
    this.state.orders.unshift(o);
    this.activity(`${o.number}: ${p.title} reserved by ${username}.`, "sale");
    this.commit();
    return o;
  }
  reorder(id, direction) {
    const index = this.state.products.findIndex((p) => p.id === id);
    if (index < 0) fail("Product not found.");
    const other = index + (direction === "up" ? -1 : 1);
    if (other < 0 || other >= this.state.products.length) return;
    [this.state.products[index], this.state.products[other]] = [
      this.state.products[other],
      this.state.products[index],
    ];
    this.commit();
  }
  block(userId, blocked) {
    const r =
      this.state.registrations.find((r) => r.userId === userId) ||
      fail("Bidder not found.");
    if (
      blocked &&
      this.state.auction?.highest?.userId === userId &&
      ["live", "paused"].includes(this.state.auction.status)
    )
      fail("Pause and cancel this auction before blocking its current leader.");
    this.state.blocked = this.state.blocked.filter((r) => r.userId !== userId);
    if (blocked) this.state.blocked.push({ userId, username: r.username });
    this.activity(
      `${r.username}: ${blocked ? "blocked" : "unblocked"}.`,
      "moderation",
    );
    this.commit();
  }
  voidBid() {
    const a = this.state.auction;
    if (a?.status !== "paused") fail("Pause the auction before voiding a bid.");
    if (!a.highest) fail("No bid to void.");
    const b = this.state.bids.find((b) => b.id === a.highest.id);
    b.voided = true;
    a.highest = this.state.bids.find((b) => !b.voided) || null;
    a.bidCount = this.state.bids.filter((b) => !b.voided).length;
    this.activity(
      `Voided ${money(b.amount)} bid from ${b.username}.`,
      "moderation",
    );
    this.commit();
  }
  shipping(id, input) {
    const o = this.order(id);
    if (isNft(o)) fail("NFT orders use a confirmed wallet, not a shipping address.");
    if (o.status !== "pending")
      fail("Shipping can only be edited before payment.");
    const required = ["name", "line1", "city", "postal_code", "country"];
    for (const k of required)
      if (!String(input[k] || "").trim())
        fail(`Shipping ${k.replace("_", " ")} is required.`);
    if (!/^[A-Z]{2}$/.test(input.country)) fail("Choose a valid country code.");
    o.shipping = Object.fromEntries(
      ["name", "line1", "line2", "city", "state", "postal_code", "country"].map(
        (k) => [
          k,
          String(input[k] || "")
            .trim()
            .slice(0, 150),
        ],
      ),
    );
    this.commit();
  }
  attachCheckout(id, session) {
    const o = this.order(id);
    if (o.status !== "pending") fail("Order is no longer pending.");
    o.checkoutId = session.id;
    o.checkoutUrl = session.url;
    o.checkoutExpires = session.expires_at * 1000;
    this.commit();
  }
  paymentEvent(eventId, type, session) {
    if (this.state.processedPayments.includes(eventId))
      return { duplicate: true };
    const o = this.order(session.metadata?.orderId);
    if (o.checkoutId !== session.id || session.client_reference_id !== o.id)
      fail("Checkout identity does not match order.");
    if (Boolean(session.livemode) !== Boolean(o.paymentLive))
      fail("Payment environment does not match order.");
    if (session.currency !== "usd" || session.amount_total !== o.total)
      fail("Payment amount does not match order.");
    if (
      [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
      ].includes(type)
    ) {
      if (["cancelled", "expired", "refunded"].includes(o.status))
        fail("Payment received for a closed order. Review required.");
      if (session.payment_status === "paid") {
        if (!["paid", "shipped", "delivered"].includes(o.status)) {
          o.status = "paid";
          o.paidAt = this.now();
          o.paymentIntent =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id;
          const details =
            session.collected_information?.shipping_details ||
            session.shipping_details;
          if (details) o.shipping = { name: details.name, ...details.address };
          o.email = session.customer_details?.email || null;
          this.activity(`${o.number}: payment verified.`, "payment");
        }
      } else if (o.status === "pending") o.status = "processing";
    } else if (
      [
        "checkout.session.expired",
        "checkout.session.async_payment_failed",
      ].includes(type)
    ) {
      if (["pending", "processing"].includes(o.status)) {
        o.status = "expired";
        const p = this.state.products.find((p) => p.id === o.product.id);
        if (p) p.quantity++;
        this.activity(
          `${o.number}: payment ${type.endsWith("expired") ? "expired" : "failed"}, stock released.`,
          "payment",
        );
      }
    }
    this.state.processedPayments.push(eventId);
    this.commit();
    return o;
  }
  markRefunded(id, refundId) {
    const o = this.order(id);
    if(['purchasing','unknown','pending','purchased','refund-pending'].includes(o.shipment?.status))fail('Void/refund the postage in Shippo and refresh the label before refunding the order.');
    if (isNft(o) && o.delivery) fail("Reconcile the authorized NFT transfer before any refund or stock release.");
    if (o.status === "refunded") return o;
    if (!["paid", "test-paid"].includes(o.status))
      fail("Only unshipped, verified payments can be refunded.");
    o.status = "refunded";
    o.refundStatus = "succeeded";
    o.refundId = refundId;
    const p = this.state.products.find((p) => p.id === o.product.id);
    if (p) p.quantity++;
    this.activity(`${o.number}: refunded; stock restored.`, "payment");
    this.commit();
    return o;
  }
  setMode(mode) {
    if (runActive(this.state.run)) fail("Stop the agent run before changing mode.");
    if (!["demo", "live"].includes(mode)) fail("Unknown mode.");
    if (["live", "paused"].includes(this.state.auction?.status))
      fail("Finish the active auction before switching modes.");
    if (this.state.vote?.status === "open")
      fail("Close the vote before switching modes.");
    if(mode==='live' && this.state.products.some(p=>p.practiceOnly))fail('Clear practice content before switching to live mode.');
    if(mode==='live' && this.state.companion.provider==='demo')this.state.companion.provider='offline';
    this.state.mode = mode;
    this.activity(`Switched to ${mode} mode.`);
    this.commit();
  }
}

installVoting(Engine);
