import {checkoutState, refundHeld, refundState} from '../commerce/lifecycles.mjs';
import Stripe from "stripe";
import {isNft} from "../commerce/nft.mjs";
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
      if(o.cryptoCheckout)throw Error('This order has a wallet payment reservation. Verify it before using Stripe or cancelling.');
      if (o.status !== "pending")
        throw new Error("This order is not awaiting payment.");
      if (isNft(o) && !o.recipientWallet) throw Error("Confirm your NFT destination wallet before checkout.");
      if (o.mode === "demo")
        throw new Error("Demo orders use simulated checkout.");
      if (checkoutState(o) === 'session-known') {
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
        if (old.status === "expired")
          this.engine.paymentEvent("reconcile-expired:" + old.id, "checkout.session.expired", old);
        throw new Error(
          "This checkout has expired. Ask the seller to re-list the item.",
        );
      }
      if(o.checkoutCreated!=null && o.paymentLive!==this.live)throw Error('Reconnect the original Stripe environment before recovering checkout.');
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
      if(o.checkoutCreated && Date.now()/1000-o.checkoutCreated>=23*3600)throw Error('Checkout outcome requires reconciliation with Stripe. Ask the seller to attach the verified session; do not retry an expired idempotency key.');
      const firstAttempt=o.checkoutCreated==null;
      o.checkoutCreated ||= Math.floor(Date.now() / 1000);
      o.checkoutRequest ||= {
          mode: "payment",
          integration_identifier: o.integrationId,
          client_reference_id: o.id,
          metadata: { orderId: o.id, app: "autoloot" },
          payment_intent_data: { metadata: { orderId: o.id, app: "autoloot" } },
          line_items: items,
          ...(!isNft(o) ? {shipping_address_collection: { allowed_countries: this.countries },
          shipping_options: [
            {
              shipping_rate_data: {
                display_name: "Shipping",
                type: "fixed_amount",
                fixed_amount: { currency: "usd", amount: o.shippingPrice },
              },
            },
          ],
          } : {}),
          success_url: this.base + "/shop?checkout=returned",
          cancel_url: this.base + "/shop?checkout=cancelled",
        };
      this.engine.commit();
      let session;
      try {session = await this.stripe.checkout.sessions.create(
        o.checkoutRequest,
        { idempotencyKey: "autoloot-checkout-" + o.id },
      );
      }catch(error){
        if(firstAttempt && ['StripeInvalidRequestError','StripeAuthenticationError','StripePermissionError'].includes(error.type)){
          delete o.checkoutCreated;delete o.checkoutRequest;this.engine.activity(`${o.number}: checkout rejected before creation.`, 'payment');this.engine.commit();
        }
        throw error;
      }
      this.engine.attachCheckout(id, session);
      return { url: session.url };
    });
  }
  async cancel(id) {
    return this.locked(id, async () => {
      const o = this.engine.order(id);
      if(o.cryptoCheckout)throw Error('This order has a wallet payment reservation. Verify it before using Stripe or cancelling.');
      if (o.status !== "pending")
        throw new Error("Only pending orders can be cancelled.");
      if (checkoutState(o) === 'outcome-unknown')
        throw new Error("Checkout outcome is unknown. Retry checkout to recover the session before cancelling; stock remains reserved.");
      if (checkoutState(o) === 'session-known') {
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
        delete o.checkoutCreated;
        this.engine.expireReservations();
        if (o.status === "expired") return o;
      }
      return this.engine.orderUpdate(id, "cancel");
    });
  }
  async reconcileCheckout(id,sessionId){
    return this.locked(id,async()=>{
      const o=this.engine.order(id);
      if(!this.stripe||o.status!=='pending'||!/^cs_[a-zA-Z0-9_]+$/.test(String(sessionId)))throw Error('Choose a pending order and its Stripe session ID.');
      const session=await this.stripe.checkout.sessions.retrieve(sessionId);
      if(session.id!==sessionId||session.metadata?.orderId!==o.id||session.client_reference_id!==o.id||session.amount_total!==o.total||session.currency!=='usd'||session.livemode!==o.paymentLive)throw Error('Session does not match this order.');
      this.engine.attachCheckout(id,session);
      if(['complete','expired'].includes(session.status))this.engine.paymentEvent('reconcile:'+session.id,session.status==='complete'?'checkout.session.completed':'checkout.session.expired',session);
      return o;
    });
  }
  async reconcileRefund(id,refundId){
    return this.locked(id,async()=>{
      const o=this.engine.order(id);
      if(!this.stripe||o.status!=='paid'||!refundHeld(o)||!/^re_[a-zA-Z0-9]+$/.test(String(refundId)))throw Error('Choose a held paid order and its Stripe refund ID.');
      const refund=await this.stripe.refunds.retrieve(refundId);
      if(refund.id!==refundId||refund.metadata?.orderId!==o.id||refund.payment_intent!==o.paymentIntent||refund.amount!==o.total||refund.currency!=='usd')throw Error('Refund does not match this order.');
      return this.applyRefund(o,refund);
    });
  }
  applyRefund(o,refund){
    if(refundState(o)==='succeeded')return o;
    if(o.refundAttempts?.some(attempt=>attempt.id===refund.id)&&['failed','canceled'].includes(refund.status))return o;
    o.refundId=refund.id;o.refundStatus=refund.status;
    if(refund.status==='succeeded')return this.engine.markRefunded(o.id,refund.id);
    if(['failed','canceled'].includes(refund.status)){
      o.refundAttempts||=[];o.refundAttempts.push({id:refund.id,status:refund.status,at:this.engine.now()});
      delete o.refundRequestedAt;delete o.refundId;
      this.engine.activity(`${o.number}: refund ${refund.status}; payment remains collected.`, 'payment');
    }
    this.engine.commit();return o;
  }
  async refund(id) {
    return this.locked(id, async () => {
      const o = this.engine.order(id);
      if(o.cryptoCheckout)throw Error('This order has a wallet payment reservation. Verify it before using Stripe or cancelling.');
      if(o.shipment?.packageId||['purchasing','unknown','pending','purchased','refund-pending'].includes(o.shipment?.status))throw Error('Void/refund the postage in Shippo and refresh the label before refunding the order.');
      if (isNft(o) && o.delivery) throw Error("NFT delivery was authorized. Reconcile the transfer before refunding.");
      if (o.mode === "demo") return this.engine.markRefunded(id, "demo-" + id);
      if (o.status !== "paid" || !o.paymentIntent)
        throw new Error(
          "Only unshipped Stripe-paid orders support an automatic full refund.",
        );
      if (!this.stripe) throw new Error("Stripe is not configured.");
      // Persist the hold before the external call: a lost response may still mean money moved.
      const firstAttempt=!refundHeld(o);
      if (firstAttempt) {
        o.refundRequestedAt = this.engine.now();
        o.refundStatus = 'requesting';
        this.engine.commit();
      }
      if(o.refundRequestedAt!=null && !o.refundId && this.engine.now()-o.refundRequestedAt>=23*3600*1000)throw Error('Refund outcome requires provider reconciliation before retry.');
      let refund;
      try {refund = o.refundId
        ? await this.stripe.refunds.retrieve(o.refundId)
        : await this.stripe.refunds.create(
            {
              payment_intent: o.paymentIntent,
              amount: o.total,
              metadata: { orderId: o.id, app: "autoloot" },
            },
            { idempotencyKey: "autoloot-refund-" + o.id + (o.refundAttempts?.length ? "-"+o.refundAttempts.length : "") },
          );
      }catch(error){
        if(firstAttempt && ['StripeInvalidRequestError','StripeAuthenticationError','StripePermissionError'].includes(error.type)){
          delete o.refundRequestedAt;o.refundStatus='rejected';this.engine.activity(`${o.number}: refund request rejected before creation.`, 'payment');this.engine.commit();
        }
        throw error;
      }
      return this.applyRefund(o,refund);
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
    return this.applyWebhook(event);
  }
  applyWebhook(event) {
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
      if(o.refundAttempts?.some(attempt=>attempt.id===r.id)&&['failed','canceled'].includes(r.status))return {ignored:true};
      if (
        o.refundId !== r.id ||
        o.paymentIntent !== r.payment_intent ||
        r.amount !== o.total ||
        r.currency !== "usd"
      )
        throw new Error("Refund does not match order.");
      if (o.refundStatus === "succeeded") return { ignored: true };
      return this.applyRefund(o,r);
    }
    return { ignored: true };
  }
}
