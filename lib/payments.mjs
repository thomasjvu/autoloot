import Stripe from "stripe";
import { randomBytes } from "node:crypto";
export class Payments {
  constructor(
    engine,
    {
      key = process.env.STRIPE_API_KEY,
      secret = process.env.STRIPE_WEBHOOK_SECRET,
      base = process.env.PUBLIC_URL || "http://localhost:4173",
      client = null,
      countries = (process.env.SHIPPING_COUNTRIES || "US")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    } = {},
  ) {
    this.engine = engine;
    this.secret = secret;
    this.base = base.replace(/\/$/, "");
    this.stripe =
      client ||
      (key ? new Stripe(key, { maxNetworkRetries: 2, timeout: 15000 }) : null);
    this.live = Boolean(key?.includes("_live_"));
    this.locks = new Map();
    this.countries = countries;
    this.status = {
      configured: Boolean(this.stripe && secret),
      environment: this.live ? "live" : "test",
      countries,
    };
  }
  locked(id, fn) {
    if (this.locks.has(id))
      throw new Error(
        "This order is already being updated. Try again shortly.",
      );
    const promise = Promise.resolve()
      .then(fn)
      .finally(() => this.locks.delete(id));
    this.locks.set(id, promise);
    return promise;
  }
  async checkout(id) {
    if (!this.status.configured)
      throw new Error(
        "Checkout is not configured. The seller must add a Stripe key and webhook secret.",
      );
    return this.locked(id, async () => {
      const o = this.engine.order(id);
      if (o.status !== "pending")
        throw new Error("This order is not awaiting payment.");
      if (o.mode === "demo")
        throw new Error("Demo orders use simulated checkout.");
      if (o.checkoutId) {
        const old = await this.stripe.checkout.sessions.retrieve(o.checkoutId);
        if (old.status === "open") return { url: old.url };
        if (old.status === "complete") {
          this.engine.paymentEvent(
            "reconcile:" + old.id,
            "checkout.session.completed",
            old,
          );
          throw new Error(
            "Checkout is complete. Refresh your orders for payment status.",
          );
        }
        throw new Error(
          "This checkout has expired. Ask the seller to re-list the item.",
        );
      }
      o.paymentLive = this.live;
      this.engine.commit();
      const items = [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: o.product.title,
              description: o.product.description.slice(0, 300) || undefined,
            },
            unit_amount: o.amount,
          },
          quantity: 1,
        },
      ];
      // Persist identifier before the API call so retried requests reuse an identical payload.
      o.integrationId ||=
        "autoloot_" +
        Array.from(randomBytes(8), (v) =>
          String.fromCharCode(97 + (v % 26)),
        ).join("");
      o.checkoutCreated ||= Math.floor(Date.now() / 1000);
      this.engine.commit();
      const session = await this.stripe.checkout.sessions.create(
        {
          mode: "payment",
          integration_identifier: o.integrationId,
          client_reference_id: o.id,
          metadata: { orderId: o.id, app: "autoloot" },
          payment_intent_data: { metadata: { orderId: o.id, app: "autoloot" } },
          line_items: items,
          shipping_address_collection: { allowed_countries: this.countries },
          shipping_options: [
            {
              shipping_rate_data: {
                display_name: "Shipping",
                type: "fixed_amount",
                fixed_amount: { currency: "usd", amount: o.shippingPrice },
              },
            },
          ],
          success_url: this.base + "/shop?checkout=returned",
          cancel_url: this.base + "/shop?checkout=cancelled",
          expires_at: o.checkoutCreated + 1800,
        },
        { idempotencyKey: "autoloot-checkout-" + o.id },
      );
      this.engine.attachCheckout(id, session);
      return { url: session.url };
    });
  }
  async cancel(id) {
    return this.locked(id, async () => {
      const o = this.engine.order(id);
      if (o.status !== "pending")
        throw new Error("Only pending orders can be cancelled.");
      if (o.checkoutId) {
        if (!this.stripe)
          throw new Error(
            "Reconnect Stripe before cancelling an active checkout.",
          );
        let session = await this.stripe.checkout.sessions.retrieve(
          o.checkoutId,
        );
        if (session.status === "open")
          session = await this.stripe.checkout.sessions.expire(o.checkoutId);
        if (session.status === "complete") {
          this.engine.paymentEvent(
            "reconcile:" + session.id,
            "checkout.session.completed",
            session,
          );
          throw new Error(
            "Payment completed. Use a refund after payment is verified.",
          );
        }
        if (session.status !== "expired")
          throw new Error(
            "Checkout could not be expired. Order remains reserved.",
          );
        if (o.status === "expired") return o;
        delete o.checkoutId;
        delete o.checkoutUrl;
      }
      return this.engine.orderUpdate(id, "cancel");
    });
  }
  async refund(id) {
    return this.locked(id, async () => {
      const o = this.engine.order(id);
      if (o.mode === "demo") return this.engine.markRefunded(id, "demo-" + id);
      if (o.status !== "paid" || !o.paymentIntent)
        throw new Error(
          "Only unshipped Stripe-paid orders support an automatic full refund.",
        );
      if (!this.stripe) throw new Error("Stripe is not configured.");
      const refund = o.refundId
        ? await this.stripe.refunds.retrieve(o.refundId)
        : await this.stripe.refunds.create(
            {
              payment_intent: o.paymentIntent,
              amount: o.total,
              metadata: { orderId: o.id, app: "autoloot" },
            },
            { idempotencyKey: "autoloot-refund-" + o.id },
          );
      o.refundId = refund.id;
      o.refundStatus = refund.status;
      if (refund.status === "succeeded")
        this.engine.markRefunded(id, refund.id);
      else this.engine.commit();
      return o;
    });
  }
  webhook(raw, signature) {
    if (!this.stripe || !this.secret)
      throw new Error("Webhooks are not configured.");
    let event;
    try {
      event = this.stripe.webhooks.constructEvent(raw, signature, this.secret);
    } catch {
      throw new Error("Invalid Stripe signature.");
    }
    const supported = [
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
      "checkout.session.async_payment_failed",
      "checkout.session.expired",
    ];
    if (supported.includes(event.type) && !event.data.object.metadata?.orderId)
      return { ignored: true };
    if (supported.includes(event.type))
      return this.engine.paymentEvent(event.id, event.type, event.data.object);
    if (event.type === "refund.updated") {
      const r = event.data.object;
      if (!r.metadata?.orderId) return { ignored: true };
      const o = this.engine.order(r.metadata.orderId);
      if (
        o.refundId !== r.id ||
        o.paymentIntent !== r.payment_intent ||
        r.amount !== o.total ||
        r.currency !== "usd"
      )
        throw new Error("Refund does not match order.");
      o.refundStatus = r.status;
      if (r.status === "succeeded") return this.engine.markRefunded(o.id, r.id);
      this.engine.commit();
    }
    return { ignored: true };
  }
}
